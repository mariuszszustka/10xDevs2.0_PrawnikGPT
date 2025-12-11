"""
PrawnikGPT Backend - Ollama Service (Enhanced)

Comprehensive service for Ollama API integration with:
- Health checks
- Model validation
- Structured outputs (JSON)
- Error recovery
- Resource management

Based on implementation plan from .ai/ollama-service-implementation-plan.md
"""

import asyncio
import json
import logging
import os
import re
import time
from typing import Any, Callable

import httpx

from backend.config import settings
from backend.services.exceptions import (
    OLLAMAUnavailableError,
    OLLAMATimeoutError,
    EmbeddingGenerationError,
    ModelNotFoundError,
    OutOfMemoryError,
)

logger = logging.getLogger(__name__)

# Cache TTL constants
HEALTH_CHECK_CACHE_TTL = 30  # seconds
MODELS_CACHE_TTL = 300  # 5 minutes

# Memory monitoring thresholds
MEMORY_WARNING_THRESHOLD = 0.80  # 80% of available memory
MEMORY_CRITICAL_THRESHOLD = 0.90  # 90% of available memory


class OllamaService:
    """
    Singleton service for OLLAMA API integration.
    
    Manages:
    - Connection to local/remote Ollama instance
    - Health checks and availability monitoring
    - Model validation and caching
    - Error recovery and retry logic
    - Resource management (timeouts, memory)
    
    Example Usage:
        ```python
        from backend.services.ollama_service import get_ollama_service
        
        # Get singleton instance
        service = get_ollama_service()
        
        # Check health
        if await service.health_check():
            print("Ollama is available")
        
        # Generate text
        response = await service.generate_text(
            prompt="What is contract law?",
            model="mistral:7b",
            system_prompt="You are a legal expert...",
            temperature=0.3,
            timeout=15
        )
        
        # Generate structured JSON response
        schema = {
            "type": "object",
            "properties": {
                "answer": {"type": "string"},
                "sources": {"type": "array"}
            }
        }
        structured = await service.generate_text_structured(
            prompt="Explain contract law",
            model="mistral:7b",
            json_schema=schema
        )
        
        # Generate embedding
        embedding = await service.generate_embedding("Legal text")
        ```
    """
    
    def __init__(
        self,
        base_url: str | None = None,
        timeout_connect: int = 5,
        timeout_read: int = 300,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ):
        """
        Initialize OllamaService.
        
        Args:
            base_url: Ollama base URL (defaults to settings.ollama_host)
            timeout_connect: Connection timeout in seconds
            timeout_read: Read timeout in seconds (for long generations)
            max_retries: Maximum retry attempts for failed requests
            retry_delay: Delay between retries in seconds
        """
        self.base_url = base_url or settings.ollama_host
        self.timeout_connect = timeout_connect
        self.timeout_read = timeout_read
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        
        # Public state
        self.is_available: bool = False
        self.available_models: list[str] = []
        
        # Private state
        self._client: httpx.AsyncClient | None = None
        self._model_cache: dict[str, bool] = {}
        self._last_health_check: float = 0.0
        self._last_models_fetch: float = 0.0
        self._connection_lock = asyncio.Lock()
        
        # Rate limiting per model - separate semaphores for different models
        self._model_semaphores: dict[str, asyncio.Semaphore] = {}
        self._init_model_semaphores()
        
        logger.info(f"OllamaService initialized: {self.base_url}")
    
    # =========================================================================
    # PRIVATE METHODS - Rate Limiting Setup
    # =========================================================================
    
    def _init_model_semaphores(self):
        """
        Initialize semaphores for rate limiting per model.
        
        Creates separate semaphores for different model types with
        configurable concurrency limits from settings.
        """
        # Default semaphore for unknown models
        default_limit = 3
        
        # Model-specific limits from settings
        model_limits = {
            settings.ollama_fast_model: settings.ollama_fast_model_concurrency,
            settings.ollama_accurate_model: settings.ollama_accurate_model_concurrency,
            settings.ollama_embedding_model: settings.ollama_embedding_model_concurrency,
        }
        
        # Create semaphores for known models
        for model, limit in model_limits.items():
            self._model_semaphores[model] = asyncio.Semaphore(limit)
            logger.debug(f"Rate limit for {model}: {limit} concurrent requests")
        
        # Store default limit for unknown models
        self._default_semaphore = asyncio.Semaphore(default_limit)
    
    def _get_model_semaphore(self, model: str) -> asyncio.Semaphore:
        """
        Get semaphore for a specific model.
        
        Returns model-specific semaphore if configured, otherwise default.
        
        Args:
            model: Model name
            
        Returns:
            asyncio.Semaphore: Semaphore for rate limiting
        """
        return self._model_semaphores.get(model, self._default_semaphore)
    
    # =========================================================================
    # PRIVATE METHODS - Memory Monitoring
    # =========================================================================
    
    def _get_memory_usage(self) -> dict[str, float]:
        """
        Get current memory usage of the process.
        
        Returns:
            dict: Memory usage information with keys:
                - used_mb: Used memory in MB
                - percent: Percentage of available memory (if available)
        """
        try:
            # Try to use psutil if available (more accurate)
            try:
                import psutil
                process = psutil.Process(os.getpid())
                mem_info = process.memory_info()
                used_mb = mem_info.rss / (1024 * 1024)  # Convert to MB
                
                # Get system memory info
                system_mem = psutil.virtual_memory()
                percent = system_mem.percent / 100.0
                
                return {
                    "used_mb": used_mb,
                    "percent": percent,
                    "available_mb": system_mem.available / (1024 * 1024),
                    "total_mb": system_mem.total / (1024 * 1024)
                }
            except ImportError:
                # Fallback to simple method using resource module (Linux/Unix)
                try:
                    import resource
                    mem_info = resource.getrusage(resource.RUSAGE_SELF)
                    used_mb = mem_info.ru_maxrss / 1024  # Convert KB to MB (Linux)
                    # On macOS, ru_maxrss is in bytes, so divide by 1024*1024
                    if hasattr(resource, 'RUSAGE_SELF'):
                        # Try to detect OS and adjust
                        import platform
                        if platform.system() == 'Darwin':  # macOS
                            used_mb = mem_info.ru_maxrss / (1024 * 1024)
                    
                    return {
                        "used_mb": used_mb,
                        "percent": None,  # Not available without psutil
                        "available_mb": None,
                        "total_mb": None
                    }
                except (ImportError, AttributeError):
                    # Last resort - return minimal info
                    return {
                        "used_mb": None,
                        "percent": None,
                        "available_mb": None,
                        "total_mb": None
                    }
        except Exception as e:
            logger.debug(f"Failed to get memory usage: {e}")
            return {
                "used_mb": None,
                "percent": None,
                "available_mb": None,
                "total_mb": None
            }
    
    def _check_memory_usage(self, context: str = "") -> None:
        """
        Check memory usage and log warnings if high.
        
        Args:
            context: Additional context for logging (e.g., model name)
        """
        if not settings.debug:
            # Only monitor memory in debug mode to avoid overhead
            return
        
        try:
            mem_info = self._get_memory_usage()
            
            if mem_info["percent"] is not None:
                percent = mem_info["percent"]
                
                if percent >= MEMORY_CRITICAL_THRESHOLD:
                    logger.error(
                        f"CRITICAL memory usage: {percent*100:.1f}% "
                        f"(used: {mem_info.get('used_mb', 'N/A'):.1f}MB, "
                        f"available: {mem_info.get('available_mb', 'N/A'):.1f}MB) "
                        f"{context}"
                    )
                elif percent >= MEMORY_WARNING_THRESHOLD:
                    logger.warning(
                        f"High memory usage: {percent*100:.1f}% "
                        f"(used: {mem_info.get('used_mb', 'N/A'):.1f}MB, "
                        f"available: {mem_info.get('available_mb', 'N/A'):.1f}MB) "
                        f"{context}"
                    )
                else:
                    logger.debug(
                        f"Memory usage: {percent*100:.1f}% "
                        f"(used: {mem_info.get('used_mb', 'N/A'):.1f}MB) "
                        f"{context}"
                    )
            elif mem_info["used_mb"] is not None:
                # Log used memory even if percent is not available
                logger.debug(
                    f"Memory usage: {mem_info['used_mb']:.1f}MB {context}"
                )
        except Exception as e:
            logger.debug(f"Memory check failed: {e}")
    
    # =========================================================================
    # PRIVATE METHODS - HTTP Client Management
    # =========================================================================
    
    async def _get_client(self) -> httpx.AsyncClient:
        """
        Get or create HTTP client (lazy initialization).
        
        Returns:
            httpx.AsyncClient: Configured async HTTP client
        """
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(
                    connect=self.timeout_connect,
                    read=self.timeout_read
                ),
                limits=httpx.Limits(
                    max_keepalive_connections=5,
                    max_connections=10
                )
            )
        
        return self._client
    
    async def _retry_request(
        self,
        func: Callable,
        max_retries: int | None = None,
        retry_delay: float | None = None
    ) -> Any:
        """
        Execute request with retry logic and exponential backoff.
        
        Args:
            func: Async function to execute
            max_retries: Max retry attempts (defaults to self.max_retries)
            retry_delay: Base delay between retries (defaults to self.retry_delay)
            
        Returns:
            Any: Function result
            
        Raises:
            OLLAMAUnavailableError: If all retries fail
        """
        max_retries = max_retries or self.max_retries
        retry_delay = retry_delay or self.retry_delay
        
        last_error = None
        
        for attempt in range(max_retries + 1):
            try:
                return await func()
            except (httpx.ConnectError, httpx.TimeoutException) as e:
                last_error = e
                
                if attempt < max_retries:
                    wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                    logger.warning(
                        f"Request failed (attempt {attempt + 1}/{max_retries + 1}), "
                        f"retrying in {wait_time:.1f}s: {e}"
                    )
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"Request failed after {max_retries + 1} attempts")
                    raise OLLAMAUnavailableError(f"Request failed: {e}") from e
            except Exception as e:
                # Don't retry on non-network errors
                raise
        
        raise OLLAMAUnavailableError(f"Request failed: {last_error}")
    
    # =========================================================================
    # PUBLIC METHODS - Health Check and Availability
    # =========================================================================
    
    async def health_check(self, force: bool = False) -> bool:
        """
        Check Ollama service availability.
        
        Uses caching (30s TTL) to avoid excessive health checks.
        
        Args:
            force: Force fresh check (bypass cache)
            
        Returns:
            bool: True if service is available
            
        Raises:
            OLLAMAUnavailableError: If service is down (only if force=True)
        
        Example:
            ```python
            service = get_ollama_service()
            
            # Check health (uses cache if checked recently)
            is_healthy = await service.health_check()
            
            # Force fresh check
            is_healthy = await service.health_check(force=True)
            ```
        """
        # Check cache first (unless forced)
        if not force:
            elapsed = time.time() - self._last_health_check
            if elapsed < HEALTH_CHECK_CACHE_TTL:
                return self.is_available
        
        async def _check():
            try:
                client = await self._get_client()
                response = await client.get("/api/version", timeout=2.0)
                
                if response.status_code == 200:
                    self.is_available = True
                    self._last_health_check = time.time()
                    logger.debug("Ollama health check: OK")
                    return True
                else:
                    logger.warning(f"Ollama health check failed: HTTP {response.status_code}")
                    self.is_available = False
                    return False
            except (httpx.ConnectError, httpx.TimeoutException) as e:
                logger.error(
                    f"Ollama service unavailable at {self.base_url}. "
                    f"Make sure Ollama is running: ollama serve"
                )
                self.is_available = False
                if force:
                    raise OLLAMAUnavailableError(
                        "Ollama service is not running. "
                        "Please start Ollama: ollama serve"
                    ) from e
                return False
            except Exception as e:
                logger.error(f"Ollama health check: UNEXPECTED ERROR - {e}")
                self.is_available = False
                return False
        
        return await self._retry_request(_check, max_retries=1)
    
    async def validate_model(self, model_name: str) -> bool:
        """
        Validate that model is available in Ollama.
        
        Args:
            model_name: Model name (e.g., 'mistral:7b')
            
        Returns:
            bool: True if model exists
            
        Raises:
            OLLAMAUnavailableError: If Ollama is not available
        """
        # Check cache first
        if model_name in self._model_cache:
            return self._model_cache[model_name]
        
        # Fetch available models
        models = await self.list_models()
        is_available = model_name in models
        
        # Cache result
        self._model_cache[model_name] = is_available
        
        if not is_available:
            logger.warning(
                f"Model '{model_name}' not found. "
                f"Available models: {models}. "
                f"Run: ollama pull {model_name}"
            )
        
        return is_available
    
    async def list_models(self, refresh: bool = False) -> list[str]:
        """
        Get list of available models.
        
        Args:
            refresh: Force refresh (bypass cache)
            
        Returns:
            list[str]: List of model names
        """
        # Check cache first (unless forced)
        if not refresh and self.available_models:
            elapsed = time.time() - self._last_models_fetch
            if elapsed < MODELS_CACHE_TTL:
                return self.available_models
        
        async def _fetch_models():
            client = await self._get_client()
            response = await client.get("/api/tags", timeout=5.0)
            
            if response.status_code == 200:
                data = response.json()
                models = [model["name"] for model in data.get("models", [])]
                self.available_models = models
                self._last_models_fetch = time.time()
                logger.info(f"Available Ollama models: {models}")
                return models
            else:
                raise OLLAMAUnavailableError(
                    f"Failed to list models: HTTP {response.status_code}"
                )
        
        try:
            models = await self._retry_request(_fetch_models)
            return models
        except httpx.ConnectError:
            raise OLLAMAUnavailableError("Cannot connect to Ollama service")
        except Exception as e:
            logger.error(f"Error listing models: {e}")
            raise OLLAMAUnavailableError(f"Unexpected error: {e}")
    
    # =========================================================================
    # PRIVATE METHODS - Validation and Helpers
    # =========================================================================
    
    def _validate_generation_params(
        self,
        prompt: str,
        model: str,
        temperature: float,
        num_ctx: int | None
    ) -> None:
        """
        Validate generation parameters.
        
        Raises:
            ValueError: If parameters are invalid
        """
        if not prompt or len(prompt.strip()) == 0:
            raise ValueError("Prompt cannot be empty")
        
        if not model or len(model.strip()) == 0:
            raise ValueError("Model name cannot be empty")
        
        if not (0.0 <= temperature <= 1.0):
            raise ValueError(f"Temperature must be between 0.0 and 1.0, got {temperature}")
        
        if num_ctx is not None and num_ctx < 0:
            raise ValueError(f"num_ctx must be non-negative, got {num_ctx}")
    
    def _build_structured_system_prompt(
        self,
        base_system_prompt: str,
        json_schema: dict,
        example_response: dict | None = None
    ) -> str:
        """
        Build enhanced system prompt with JSON schema instructions.
        
        Args:
            base_system_prompt: Base system prompt
            json_schema: JSON schema definition
            example_response: Optional example response
            
        Returns:
            str: Enhanced system prompt with schema
        """
        schema_str = json.dumps(json_schema, indent=2, ensure_ascii=False)
        
        schema_instructions = f"""
WAŻNE: Odpowiedz TYLKO w formacie JSON zgodnym z poniższym schematem.

Schemat JSON:
{schema_str}
"""
        
        if example_response:
            example_str = json.dumps(example_response, indent=2, ensure_ascii=False)
            schema_instructions += f"""
Przykład poprawnej odpowiedzi:
{example_str}
"""
        
        schema_instructions += """
Pamiętaj:
- Odpowiedź musi być poprawnym JSON (bez dodatkowego tekstu przed/po)
- Wszystkie wymagane pola muszą być wypełnione
- Typy danych muszą być zgodne ze schematem
"""
        
        return f"{base_system_prompt}\n\n{schema_instructions}"
    
    def _parse_json_response(self, text: str, json_schema: dict | None = None) -> dict:
        """
        Parse JSON response with validation.
        
        Args:
            text: Raw response text
            json_schema: Optional JSON schema for validation
            
        Returns:
            dict: Parsed JSON
            
        Raises:
            ValueError: If JSON is invalid or doesn't match schema
        """
        # Try to extract JSON from text (in case model added extra text)
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
        else:
            json_str = text.strip()
        
        try:
            parsed = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}\nResponse: {text[:200]}")
            raise ValueError(f"Invalid JSON response: {e}")
        
        # Optional: Validate against schema using jsonschema library
        if json_schema:
            try:
                import jsonschema
                jsonschema.validate(parsed, json_schema)
            except ImportError:
                logger.warning("jsonschema not installed, skipping validation")
            except jsonschema.ValidationError as e:
                logger.error(f"JSON schema validation failed: {e}")
                raise ValueError(f"Response doesn't match schema: {e}")
        
        return parsed
    
    # =========================================================================
    # PUBLIC METHODS - Text Generation
    # =========================================================================
    
    async def generate_text(
        self,
        prompt: str,
        model: str,
        system_prompt: str | None = None,
        temperature: float = 0.3,
        top_p: float = 0.9,
        top_k: int = 40,
        num_ctx: int | None = None,
        seed: int | None = None,
        timeout: int | None = None,
        stream: bool = False
    ) -> str:
        """
        Generate text using Ollama model.
        
        Automatically uses model-specific timeouts if not provided:
        - Fast model (mistral:7b): 15s
        - Accurate model (gpt-oss:120b): 240s
        - Other models: 60s default
        
        Args:
            prompt: User prompt/question
            model: Model name (e.g., 'mistral:7b')
            system_prompt: System prompt (role definition)
            temperature: Sampling temperature (0.0-1.0)
            top_p: Nucleus sampling parameter
            top_k: Top-k sampling parameter
            num_ctx: Context window size (tokens)
            seed: Random seed for reproducibility
            timeout: Request timeout in seconds (overrides default)
            stream: Enable streaming (not implemented yet)
            
        Returns:
            str: Generated text
            
        Raises:
            OLLAMAUnavailableError: If service unavailable
            OLLAMATimeoutError: If request times out
            ValueError: If prompt is empty or model invalid
            ModelNotFoundError: If model not found
            OutOfMemoryError: If model requires more memory
        
        Example:
            ```python
            service = get_ollama_service()
            
            # Basic generation
            response = await service.generate_text(
                prompt="What is contract law?",
                model="mistral:7b",
                timeout=15
            )
            
            # With system prompt
            response = await service.generate_text(
                prompt="Explain Article 29 of Labor Code",
                model="mistral:7b",
                system_prompt="You are a legal expert specializing in Polish law.",
                temperature=0.3,
                timeout=15
            )
            ```
        """
        # Validate parameters
        self._validate_generation_params(prompt, model, temperature, num_ctx)
        
        # Use model-specific timeout if not provided
        if timeout is None:
            if model == settings.ollama_fast_model:
                timeout = settings.ollama_fast_timeout  # 15s
            elif model == settings.ollama_accurate_model:
                timeout = settings.ollama_accurate_timeout  # 240s
            else:
                timeout = 60  # Default
        
        # Validate model exists
        if not await self.validate_model(model):
            available = await self.list_models()
            raise ModelNotFoundError(
                f"Model '{model}' not found. "
                f"Available models: {available}. "
                f"To install: ollama pull {model}"
            )
        
        async def _generate():
            # Use model-specific semaphore for rate limiting
            semaphore = self._get_model_semaphore(model)
            async with semaphore:  # Limit concurrent requests per model
                # Check memory before generation
                self._check_memory_usage(context=f"before generation with {model}")
                
                client = await self._get_client()
                
                # Build request payload
                payload = {
                    "model": model,
                    "prompt": prompt.strip(),
                    "stream": stream,
                    "options": {
                        "temperature": temperature,
                        "top_p": top_p,
                        "top_k": top_k
                    }
                }
                
                # Add optional parameters
                if system_prompt:
                    payload["system"] = system_prompt
                if num_ctx is not None:
                    payload["options"]["num_ctx"] = num_ctx
                if seed is not None:
                    payload["options"]["seed"] = seed
                
                logger.info(
                    f"Starting generation with {model} "
                    f"(timeout={timeout}s, temp={temperature})"
                )
                
                start_time = time.time()
                
                try:
                    # Use custom timeout for this request
                    response = await client.post(
                        "/api/generate",
                        json=payload,
                        timeout=timeout
                    )
                    
                    if response.status_code == 404:
                        error_text = response.text.lower()
                        if "model" in error_text and "not found" in error_text:
                            raise ModelNotFoundError(
                                f"Model '{model}' not found. "
                                f"Run: ollama pull {model}"
                            )
                    
                    if response.status_code == 500:
                        error_text = response.text.lower()
                        if "memory" in error_text or "oom" in error_text:
                            logger.error(
                                f"Out of memory error with model {model}. "
                                f"Consider: 1) Using smaller model, 2) Reducing num_ctx, "
                                f"3) Closing other applications, 4) Using GPU with more VRAM"
                            )
                            raise OutOfMemoryError(
                                f"Model {model} requires more memory. "
                                f"Try using a smaller model or reducing context size."
                            )
                    
                    if response.status_code != 200:
                        raise OLLAMAUnavailableError(
                            f"OLLAMA generation failed: HTTP {response.status_code}"
                        )
                    
                    # Parse response
                    data = response.json()
                    generated_text = data.get("response", "")
                    
                    if not generated_text:
                        raise OLLAMAUnavailableError("OLLAMA returned empty response")
                    
                    generation_time = time.time() - start_time
                    
                    # Check memory after generation
                    self._check_memory_usage(context=f"after generation with {model}")
                    
                    logger.info(
                        f"Generation completed: {len(generated_text)} chars "
                        f"in {generation_time:.2f}s with {model}"
                    )
                    
                    return generated_text.strip()
                    
                except httpx.TimeoutException:
                    generation_time = time.time() - start_time
                    logger.error(
                        f"Generation timeout after {generation_time:.2f}s with model {model}. "
                        f"Consider: 1) Using faster model, 2) Reducing context size, "
                        f"3) Increasing timeout"
                    )
                    raise OLLAMATimeoutError(
                        f"Generation timed out after {timeout}s. "
                        f"Model: {model}"
                    )
                except (ModelNotFoundError, OutOfMemoryError, OLLAMATimeoutError):
                    raise  # Re-raise our custom errors
                except httpx.ConnectError:
                    raise OLLAMAUnavailableError("Cannot connect to Ollama service")
                except Exception as e:
                    logger.error(f"Unexpected error during generation: {e}")
                    raise OLLAMAUnavailableError(f"Generation failed: {e}")
        
        return await self._retry_request(_generate, max_retries=1)  # Only retry once for generation
    
    async def generate_text_structured(
        self,
        prompt: str,
        model: str,
        json_schema: dict,
        system_prompt: str | None = None,
        temperature: float = 0.3,
        timeout: int | None = None
    ) -> dict:
        """
        Generate structured JSON response using Ollama.
        
        Uses Ollama's 'format: json' parameter and injects JSON schema
        into system prompt to guide model output. Automatically extracts
        JSON from response text if model adds extra text.
        
        Args:
            prompt: User prompt/question
            model: Model name
            json_schema: JSON schema definition (dict)
            system_prompt: Base system prompt (will be extended with schema)
            temperature: Sampling temperature
            timeout: Request timeout
            
        Returns:
            dict: Parsed JSON response
            
        Raises:
            OLLAMAUnavailableError: If service unavailable
            ValueError: If response is not valid JSON
        
        Example:
            ```python
            service = get_ollama_service()
            
            schema = {
                "type": "object",
                "properties": {
                    "answer": {"type": "string"},
                    "sources": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "act_title": {"type": "string"},
                                "article": {"type": "string"}
                            }
                        }
                    },
                    "confidence": {"type": "number", "minimum": 0, "maximum": 1}
                },
                "required": ["answer", "sources"]
            }
            
            response = await service.generate_text_structured(
                prompt="What is contract law?",
                model="mistral:7b",
                json_schema=schema,
                system_prompt="You are a legal expert."
            )
            
            # response = {
            #     "answer": "Contract law is...",
            #     "sources": [{"act_title": "Kodeks cywilny", "article": "Art. 29"}],
            #     "confidence": 0.95
            # }
            ```
        """
        # Build enhanced system prompt with schema
        enhanced_system_prompt = self._build_structured_system_prompt(
            base_system_prompt=system_prompt or "",
            json_schema=json_schema
        )
        
        async def _generate_structured():
            # Use model-specific semaphore for rate limiting
            semaphore = self._get_model_semaphore(model)
            async with semaphore:  # Limit concurrent requests per model
                client = await self._get_client()
                
                # Build request payload with format: json
                payload = {
                    "model": model,
                    "prompt": prompt.strip(),
                    "format": "json",  # Ollama parameter for JSON output
                    "system": enhanced_system_prompt,
                    "options": {
                        "temperature": temperature
                    }
                }
                
                # Use model-specific timeout if not provided
                if timeout is None:
                    if model == settings.ollama_fast_model:
                        timeout = settings.ollama_fast_timeout
                    elif model == settings.ollama_accurate_model:
                        timeout = settings.ollama_accurate_timeout
                    else:
                        timeout = 60
                
                logger.info(
                    f"Starting structured generation with {model} "
                    f"(timeout={timeout}s, format=json)"
                )
                
                try:
                    response = await client.post(
                        "/api/generate",
                        json=payload,
                        timeout=timeout
                    )
                    
                    if response.status_code != 200:
                        raise OLLAMAUnavailableError(
                            f"Structured generation failed: HTTP {response.status_code}"
                        )
                    
                    # Parse response
                    data = response.json()
                    response_text = data.get("response", "")
                    
                    if not response_text:
                        raise ValueError("Ollama returned empty response")
                    
                    # Try to parse JSON
                    try:
                        parsed = self._parse_json_response(response_text, json_schema)
                        logger.info(f"Structured generation completed successfully")
                        return parsed
                    except ValueError as e:
                        logger.error(
                            f"Failed to parse JSON response from model {model}. "
                            f"Response: {response_text[:200]}"
                        )
                        # Fallback: Try to extract JSON from text
                        try:
                            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                            if json_match:
                                parsed = json.loads(json_match.group(0))
                                logger.warning("Extracted JSON from text (model added extra text)")
                                return parsed
                        except Exception:
                            pass
                        
                        raise ValueError(
                            f"Model did not return valid JSON. "
                            f"Response: {response_text[:200]}"
                        ) from e
                        
                except httpx.TimeoutException:
                    raise OLLAMATimeoutError(
                        f"Structured generation timed out after {timeout}s"
                    )
                except httpx.ConnectError:
                    raise OLLAMAUnavailableError("Cannot connect to Ollama service")
                except (ValueError, OLLAMATimeoutError, OLLAMAUnavailableError):
                    raise  # Re-raise our custom errors
                except Exception as e:
                    logger.error(f"Unexpected error during structured generation: {e}")
                    raise OLLAMAUnavailableError(f"Structured generation failed: {e}")
        
        return await self._retry_request(_generate_structured, max_retries=1)
    
    # =========================================================================
    # PUBLIC METHODS - Embedding Generation
    # =========================================================================
    
    async def generate_embedding(
        self,
        text: str,
        model: str | None = None,
        timeout: int | None = None
    ) -> list[float]:
        """
        Generate embedding vector for text.
        
        Defaults to nomic-embed-text model (768 dimensions) if model not specified.
        
        Args:
            text: Input text
            model: Embedding model (defaults to settings.ollama_embedding_model)
            timeout: Request timeout
            
        Returns:
            list[float]: Embedding vector (768-dim for nomic-embed-text)
            
        Raises:
            EmbeddingGenerationError: If generation fails
            OLLAMATimeoutError: If request times out
        
        Example:
            ```python
            service = get_ollama_service()
            
            # Generate embedding (uses default model)
            embedding = await service.generate_embedding("Kodeks cywilny")
            # Returns: [0.123, -0.456, ..., 0.789]  # 768 dimensions
            
            # With custom model
            embedding = await service.generate_embedding(
                text="Legal text",
                model="nomic-embed-text",
                timeout=30
            )
            ```
        """
        # Validation
        if not text or len(text.strip()) == 0:
            raise EmbeddingGenerationError("Text cannot be empty")
        
        # Use defaults from settings if not provided
        model = model or settings.ollama_embedding_model
        timeout = timeout or settings.ollama_embedding_timeout
        
        async def _generate_embedding():
            # Use model-specific semaphore for rate limiting
            semaphore = self._get_model_semaphore(model or settings.ollama_embedding_model)
            async with semaphore:  # Limit concurrent requests per model
                client = await self._get_client()
                
                logger.debug(f"Generating embedding with {model}: {text[:50]}...")
                
                try:
                    response = await client.post(
                        "/api/embeddings",
                        json={
                            "model": model,
                            "prompt": text.strip()
                        },
                        timeout=timeout
                    )
                    
                    if response.status_code != 200:
                        raise EmbeddingGenerationError(
                            f"Embedding generation failed: HTTP {response.status_code}"
                        )
                    
                    data = response.json()
                    embedding = data.get("embedding")
                    
                    if not embedding:
                        raise EmbeddingGenerationError("No embedding in response")
                    
                    logger.debug(f"Generated embedding: {len(embedding)} dimensions")
                    return embedding
                    
                except httpx.TimeoutException:
                    logger.error(f"Embedding generation timeout ({timeout}s): {text[:50]}...")
                    raise OLLAMATimeoutError(
                        f"Embedding generation timed out after {timeout}s"
                    )
                except httpx.ConnectError:
                    raise OLLAMAUnavailableError("Cannot connect to Ollama service")
                except (EmbeddingGenerationError, OLLAMATimeoutError, OLLAMAUnavailableError):
                    raise  # Re-raise our custom errors
                except Exception as e:
                    logger.error(f"Embedding generation error: {e}")
                    raise EmbeddingGenerationError(f"Unexpected error: {e}")
        
        return await self._retry_request(_generate_embedding)
    
    # =========================================================================
    # MODEL WARMUP
    # =========================================================================
    
    async def warmup_model(self, model: str, timeout: int = 30) -> bool:
        """
        Warm up model by sending a small test request.
        
        This pre-loads the model into memory to avoid cold start delays
        on first real request.
        
        Args:
            model: Model name to warm up
            timeout: Timeout for warmup request
            
        Returns:
            bool: True if warmup successful, False otherwise
        """
        try:
            logger.info(f"Warming up model: {model}")
            
            # Use a minimal prompt to trigger model loading
            test_prompt = "Test"
            
            await self.generate_text(
                prompt=test_prompt,
                model=model,
                timeout=timeout,
                temperature=0.1  # Low temperature for faster generation
            )
            
            logger.info(f"Model {model} warmed up successfully")
            return True
            
        except Exception as e:
            logger.warning(f"Model warmup failed for {model} (non-fatal): {e}")
            return False
    
    async def warmup_models(self, models: list[str] | None = None) -> dict[str, bool]:
        """
        Warm up multiple models concurrently.
        
        Args:
            models: List of model names to warm up. If None, warms up
                   default models from settings.
                   
        Returns:
            dict: Mapping of model name to warmup success status
        """
        if models is None:
            models = [
                settings.ollama_fast_model,
                settings.ollama_embedding_model
            ]
        
        logger.info(f"Starting warmup for {len(models)} models: {models}")
        
        # Warm up models concurrently
        import asyncio
        warmup_tasks = [
            self.warmup_model(model, timeout=30) for model in models
        ]
        
        results = await asyncio.gather(*warmup_tasks, return_exceptions=True)
        
        # Build result dictionary
        warmup_results = {}
        for model, result in zip(models, results):
            if isinstance(result, Exception):
                logger.error(f"Warmup exception for {model}: {result}")
                warmup_results[model] = False
            else:
                warmup_results[model] = result
        
        successful = sum(1 for v in warmup_results.values() if v)
        logger.info(
            f"Warmup completed: {successful}/{len(models)} models successful. "
            f"Results: {warmup_results}"
        )
        
        return warmup_results


# =========================================================================
# COMPATIBILITY FUNCTIONS (for backward compatibility)
# =========================================================================

async def generate_embedding(
    text: str,
    model: str | None = None,
    timeout: int | None = None
) -> list[float]:
    """
    Generate embedding vector for text (compatibility function).
    
    This function maintains backward compatibility with existing code
    that imports generate_embedding directly.
    
    Args:
        text: Input text
        model: Embedding model (optional)
        timeout: Request timeout (optional)
        
    Returns:
        list[float]: Embedding vector
        
    Raises:
        EmbeddingGenerationError: If generation fails
    """
    service = get_ollama_service()
    return await service.generate_embedding(text, model, timeout)


# =========================================================================
# SINGLETON INSTANCE
# =========================================================================

_ollama_service: OllamaService | None = None


def get_ollama_service() -> OllamaService:
    """
    Get or create OllamaService singleton instance.
    
    Returns:
        OllamaService: Singleton instance
    """
    global _ollama_service
    
    if _ollama_service is None:
        _ollama_service = OllamaService(
            base_url=settings.ollama_host,
            timeout_connect=5,
            timeout_read=300,  # 5 minutes for accurate model
            max_retries=3,
            retry_delay=1.0
        )
    
    return _ollama_service
