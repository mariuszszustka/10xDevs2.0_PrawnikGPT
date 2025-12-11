# Plan Wdrożenia Ollama Service (Local LLM)

## 1. Opis Usługi (Local Inference Service)

Ollama Service to usługa integracyjna dla lokalnego interfejsu API Ollama, która zapewnia:

- **Generowanie odpowiedzi tekstowych** z modeli LLM (fast i accurate)
- **Generowanie embeddingów** dla wyszukiwania semantycznego
- **Zarządzanie połączeniami** z lokalnym serwisem Ollama
- **Health checks** i monitoring dostępności usługi
- **Obsługę błędów** specyficzną dla środowiska lokalnego
- **Structured outputs** (JSON format) dla ustrukturyzowanych odpowiedzi
- **Zarządzanie zasobami** (pamięć RAM, timeouty, retry logic)

### Architektura

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         OllamaService (Singleton)                     │  │
│  │                                                       │  │
│  │  - Connection Management                             │  │
│  │  - Health Checks                                     │  │
│  │  - Model Validation                                  │  │
│  │  - Error Recovery                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          │ HTTP/REST                         │
│                          ↓                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                    Ollama Service                            │
│              (localhost:11434 lub remote)                    │
│                                                              │
│  - mistral:7b (fast model)                                  │
│  - gpt-oss:120b (accurate model)                            │
│  - nomic-embed-text (embeddings)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Opis Konstruktora (Inicjalizacja Klienta Ollama/URL Bazowego)

### 2.1. Klasa OllamaService

```python
class OllamaService:
    """
    Singleton service for OLLAMA API integration.
    
    Manages:
    - Connection to local/remote Ollama instance
    - Health checks and availability monitoring
    - Model validation and caching
    - Error recovery and retry logic
    - Resource management (timeouts, memory)
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
```

### 2.2. Inicjalizacja Pól

**Pola publiczne:**
- `base_url: str` - Bazowy URL do Ollama API
- `is_available: bool` - Status dostępności (cache)
- `available_models: List[str]` - Lista dostępnych modeli (cache)

**Pola prywatne:**
- `_client: httpx.AsyncClient | None` - Klient HTTP (lazy initialization)
- `_health_check_cache: Dict[str, Any]` - Cache dla health checks
- `_model_cache: Dict[str, bool]` - Cache dostępności modeli
- `_last_health_check: float` - Timestamp ostatniego health check
- `_connection_lock: asyncio.Lock` - Lock dla thread-safe operacji

### 2.3. Przykład Inicjalizacji

```python
# W backend/services/ollama_service.py

from backend.config import settings

# Singleton instance
_ollama_service: OllamaService | None = None

def get_ollama_service() -> OllamaService:
    """Get or create OllamaService singleton instance."""
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
```

---

## 3. Publiczne Metody i Pola

### 3.1. Health Check i Dostępność

```python
async def health_check(self, force: bool = False) -> bool:
    """
    Check Ollama service availability.
    
    Args:
        force: Force fresh check (bypass cache)
        
    Returns:
        bool: True if service is available
        
    Raises:
        OLLAMAUnavailableError: If service is down
    """
```

**Implementacja:**
- Cache wyników przez 30 sekund (unika zbyt częstych sprawdzeń)
- Sprawdza endpoint `/api/version`
- Aktualizuje `is_available` i `_last_health_check`
- Loguje błędy połączenia

**Przykład użycia:**
```python
service = get_ollama_service()
is_healthy = await service.health_check()
if not is_healthy:
    raise OLLAMAUnavailableError("Ollama service is down")
```

### 3.2. Walidacja Modeli

```python
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
```

**Implementacja:**
- Sprawdza cache `_model_cache`
- Jeśli nie w cache, wywołuje `/api/tags` i sprawdza listę modeli
- Aktualizuje cache
- Loguje ostrzeżenia jeśli model nie istnieje

**Przykład użycia:**
```python
if not await service.validate_model("mistral:7b"):
    raise ValueError("Model mistral:7b not found. Run: ollama pull mistral:7b")
```

### 3.3. Generowanie Tekstu (Podstawowe)

```python
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
    """
```

**Przykład użycia:**
```python
response = await service.generate_text(
    prompt="Co to jest umowa o pracę?",
    model="mistral:7b",
    system_prompt="Jesteś ekspertem prawnym...",
    temperature=0.3,
    timeout=15
)
```

### 3.4. Generowanie Tekstu (Structured Output - JSON)

```python
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
    into system prompt to guide model output.
    
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
    """
```

**Implementacja Structured Output:**

Ollama obsługuje structured outputs na dwa sposoby:

**Metoda 1: Parametr `format: 'json'` (Rekomendowana)**
```python
payload = {
    "model": model,
    "prompt": prompt,
    "format": "json",  # Wymusza JSON output
    "system": enhanced_system_prompt,  # Zawiera schema definition
    "options": {
        "temperature": temperature
    }
}
```

**Metoda 2: Schema w System Prompt (Fallback)**
Jeśli model nie obsługuje `format: 'json'`, wstrzykujemy schemat do system prompt:

```python
json_schema_str = json.dumps(json_schema, indent=2, ensure_ascii=False)

enhanced_system_prompt = f"""{base_system_prompt}

WAŻNE: Odpowiedz TYLKO w formacie JSON zgodnym z poniższym schematem:

{json_schema_str}

Przykład poprawnej odpowiedzi:
{json.dumps(example_response, indent=2, ensure_ascii=False)}
"""
```

**Przykład użycia:**
```python
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
    prompt="Co to jest umowa o pracę?",
    model="mistral:7b",
    json_schema=schema,
    system_prompt="Jesteś ekspertem prawnym..."
)

# response = {
#     "answer": "Umowa o pracę to...",
#     "sources": [{"act_title": "Kodeks pracy", "article": "Art. 29"}],
#     "confidence": 0.95
# }
```

### 3.5. Generowanie Embeddingów

```python
async def generate_embedding(
    self,
    text: str,
    model: str | None = None,
    timeout: int | None = None
) -> list[float]:
    """
    Generate embedding vector for text.
    
    Args:
        text: Input text
        model: Embedding model (defaults to settings.ollama_embedding_model)
        timeout: Request timeout
        
    Returns:
        list[float]: Embedding vector (768-dim for nomic-embed-text)
        
    Raises:
        EmbeddingGenerationError: If generation fails
    """
```

**Przykład użycia:**
```python
embedding = await service.generate_embedding("Kodeks cywilny")
# Returns: [0.123, -0.456, ..., 0.789]  # 768 dimensions
```

### 3.6. Lista Dostępnych Modeli

```python
async def list_models(self, refresh: bool = False) -> list[str]:
    """
    Get list of available models.
    
    Args:
        refresh: Force refresh (bypass cache)
        
    Returns:
        list[str]: List of model names
    """
```

---

## 4. Prywatne Metody i Pola

### 4.1. Zarządzanie Klientem HTTP

```python
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
```

### 4.2. Retry Logic z Exponential Backoff

```python
async def _retry_request(
    self,
    func: Callable,
    max_retries: int | None = None,
    retry_delay: float | None = None
) -> Any:
    """
    Execute request with retry logic.
    
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
```

### 4.3. Walidacja Parametrów

```python
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
```

### 4.4. Budowanie System Prompt z JSON Schema

```python
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
```

### 4.5. Parsowanie JSON z Walidacją

```python
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
    import re
    
    # Look for JSON object in text
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
```

---

## 5. Obsługa Błędów (Specyficzna dla Self-Hosted)

### 5.1. Scenariusze Błędów i Rozwiązania

#### 5.1.1. Ollama Nie Jest Uruchomiona

**Objawy:**
- `httpx.ConnectError: Connection refused`
- `httpx.ConnectError: Connection timeout`
- Health check zwraca `False`

**Rozwiązanie:**
```python
async def health_check(self, force: bool = False) -> bool:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{self.base_url}/api/version")
            return response.status_code == 200
    except (httpx.ConnectError, httpx.TimeoutException):
        logger.error(
            f"Ollama service unavailable at {self.base_url}. "
            f"Make sure Ollama is running: ollama serve"
        )
        return False
```

**Komunikat błędu dla użytkownika:**
```python
raise OLLAMAUnavailableError(
    "Ollama service is not running. "
    "Please start Ollama: ollama serve"
)
```

#### 5.1.2. Model Nie Został Pobrany (Pull)

**Objawy:**
- HTTP 404 z endpointu `/api/generate`
- Response: `"model 'xyz' not found"`

**Rozwiązanie:**
```python
async def validate_model(self, model_name: str) -> bool:
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
```

**Komunikat błędu:**
```python
raise ValueError(
    f"Model '{model_name}' not found. "
    f"Available models: {available_models}. "
    f"To install: ollama pull {model_name}"
)
```

#### 5.1.3. Timeout Przy Generowaniu

**Objawy:**
- `httpx.TimeoutException` po przekroczeniu timeout
- Długie generowanie (szczególnie dla dużych modeli)

**Rozwiązanie:**
```python
async def generate_text(
    self,
    prompt: str,
    model: str,
    timeout: int | None = None,
    ...
) -> str:
    # Use model-specific timeout if not provided
    if timeout is None:
        if model == settings.ollama_fast_model:
            timeout = settings.ollama_fast_timeout  # 15s
        elif model == settings.ollama_accurate_model:
            timeout = settings.ollama_accurate_timeout  # 240s
        else:
            timeout = 60  # Default
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            # ... request ...
    except httpx.TimeoutException:
        logger.error(
            f"Generation timeout after {timeout}s with model {model}. "
            f"Consider: 1) Using faster model, 2) Reducing context size, "
            f"3) Increasing timeout"
        )
        raise OLLAMATimeoutError(
            f"Generation timed out after {timeout}s. "
            f"Model: {model}"
        )
```

#### 5.1.4. Brak Pamięci RAM (OOM - Out of Memory)

**Objawy:**
- Ollama zwraca błąd 500
- Response: `"out of memory"` lub `"CUDA out of memory"`
- Model nie może się załadować

**Rozwiązanie:**
```python
async def generate_text(self, ...) -> str:
    try:
        # ... request ...
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 500:
            error_text = e.response.text.lower()
            if "memory" in error_text or "oom" in error_text:
                logger.error(
                    f"Out of memory error with model {model}. "
                    f"Consider: 1) Using smaller model, 2) Reducing num_ctx, "
                    f"3) Closing other applications, 4) Using GPU with more VRAM"
                )
                raise OLLAMAUnavailableError(
                    f"Model {model} requires more memory. "
                    f"Try using a smaller model or reducing context size."
                )
        raise
```

#### 5.1.5. Nieprawidłowy Format JSON (Structured Output)

**Objawy:**
- Model zwraca tekst zamiast JSON
- JSON jest niepoprawny (syntax error)
- JSON nie pasuje do schematu

**Rozwiązanie:**
```python
async def generate_text_structured(
    self,
    prompt: str,
    model: str,
    json_schema: dict,
    ...
) -> dict:
    # Generate with format: json
    response_text = await self.generate_text(
        prompt=prompt,
        model=model,
        system_prompt=enhanced_system_prompt,
        format="json",  # Ollama parameter
        ...
    )
    
    # Try to parse JSON
    try:
        parsed = self._parse_json_response(response_text, json_schema)
        return parsed
    except ValueError as e:
        logger.error(
            f"Failed to parse JSON response from model {model}. "
            f"Response: {response_text[:200]}"
        )
        # Fallback: Try to extract JSON from text
        try:
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
                return parsed
        except:
            pass
        
        raise ValueError(
            f"Model did not return valid JSON. "
            f"Response: {response_text[:200]}"
        )
```

#### 5.1.6. Cold Start Modelu (Pierwsze Użycie)

**Objawy:**
- Pierwsze zapytanie do modelu jest bardzo wolne (10-30s)
- Model musi się załadować do pamięci

**Rozwiązanie:**
```python
async def _warmup_model(self, model: str) -> None:
    """
    Warm up model by sending a small test request.
    
    This pre-loads the model into memory to avoid cold start delays.
    """
    try:
        logger.info(f"Warming up model: {model}")
        await self.generate_text(
            prompt="Test",
            model=model,
            timeout=30
        )
        logger.info(f"Model {model} warmed up successfully")
    except Exception as e:
        logger.warning(f"Model warmup failed (non-fatal): {e}")

# Call during service initialization (optional)
async def initialize(self) -> None:
    """Initialize service and warm up models."""
    # Check health
    if not await self.health_check():
        raise OLLAMAUnavailableError("Ollama service unavailable")
    
    # Warm up fast model (optional, can be done in background)
    asyncio.create_task(self._warmup_model(settings.ollama_fast_model))
```

### 5.2. Hierarchia Wyjątków

```python
# W backend/services/exceptions.py

class OLLAMAUnavailableError(ServiceUnavailableError):
    """Raised when Ollama service is unavailable"""
    pass

class OLLAMATimeoutError(TimeoutError):
    """Raised when Ollama request times out"""
    pass

class ModelNotFoundError(OLLAMAUnavailableError):
    """Raised when model is not found"""
    pass

class OutOfMemoryError(OLLAMAUnavailableError):
    """Raised when model requires more memory than available"""
    pass
```

---

## 6. Kwestie Bezpieczeństwa i Wydajności (Zarządzanie Zasobami Lokalnymi)

### 6.1. Zarządzanie Pamięcią RAM

**Problem:** Duże modele (120B) wymagają dużo pamięci RAM/VRAM.

**Rozwiązania:**

1. **Lazy Loading Modeli**
   - Modele ładują się tylko gdy są używane
   - Ollama automatycznie zarządza tym, ale możemy monitorować

2. **Monitoring Użycia Pamięci**
   ```python
   async def check_model_memory_usage(self, model: str) -> dict:
       """
       Check memory usage for model (if Ollama exposes this).
       
       Returns:
           dict: Memory usage info
       """
       # Ollama doesn't expose this directly, but we can:
       # 1. Monitor system memory before/after generation
       # 2. Use Ollama's /api/show endpoint for model info
       try:
           async with httpx.AsyncClient() as client:
               response = await client.post(
                   f"{self.base_url}/api/show",
                   json={"name": model}
               )
               if response.status_code == 200:
                   data = response.json()
                   return {
                       "model_size": data.get("size", 0),
                       "parameters": data.get("parameter_count", 0)
                   }
       except:
           pass
       return {}
   ```

3. **Ograniczenie Kontekstu (num_ctx)**
   ```python
   # Reduce context window if memory is limited
   if model == "gpt-oss:120b":
       num_ctx = min(num_ctx or 4096, 2048)  # Limit to 2048 tokens
   ```

### 6.2. Zarządzanie Połączeniami HTTP

**Problem:** Zbyt wiele równoczesnych połączeń może przeciążyć Ollama.

**Rozwiązania:**

1. **Connection Pooling**
   ```python
   self._client = httpx.AsyncClient(
       limits=httpx.Limits(
           max_keepalive_connections=5,  # Reuse connections
           max_connections=10  # Max concurrent connections
       )
   )
   ```

2. **Rate Limiting (na poziomie aplikacji)**
   ```python
   from asyncio import Semaphore
   
   class OllamaService:
       def __init__(self, ...):
           self._concurrent_requests = Semaphore(3)  # Max 3 concurrent
   
       async def generate_text(self, ...):
           async with self._concurrent_requests:
               # ... make request ...
   ```

### 6.3. Timeout Management

**Problem:** Różne modele mają różne czasy odpowiedzi.

**Rozwiązania:**

1. **Model-Specific Timeouts**
   ```python
   MODEL_TIMEOUTS = {
       "mistral:7b": 15,
       "gpt-oss:120b": 240,
       "nomic-embed-text": 30
   }
   
   timeout = MODEL_TIMEOUTS.get(model, 60)
   ```

2. **Adaptive Timeouts**
   ```python
   # Increase timeout if previous requests were slow
   if self._last_generation_time > timeout * 0.8:
       timeout = int(timeout * 1.5)  # Increase by 50%
   ```

### 6.4. Caching i Optymalizacja

1. **Cache Health Checks**
   ```python
   HEALTH_CHECK_CACHE_TTL = 30  # seconds
   
   async def health_check(self, force: bool = False) -> bool:
       if not force:
           elapsed = time.time() - self._last_health_check
           if elapsed < HEALTH_CHECK_CACHE_TTL:
               return self.is_available
   ```

2. **Cache Listy Modeli**
   ```python
   MODELS_CACHE_TTL = 300  # 5 minutes
   
   async def list_models(self, refresh: bool = False) -> list[str]:
       if not refresh and self.available_models:
           return self.available_models
       # ... fetch models ...
   ```

### 6.5. Bezpieczeństwo (Lokalne Środowisko)

**Uwagi:**
- Ollama działa lokalnie, więc nie ma potrzeby autentykacji API
- Jeśli Ollama jest dostępna przez sieć, rozważ:
  - Firewall rules (ograniczenie dostępu)
  - Reverse proxy z autentykacją (nginx)
  - Ollama's built-in authentication (jeśli dostępne)

**Rekomendacje:**
```python
# W production, validate that Ollama is not exposed publicly
if settings.is_production:
    parsed = urlparse(settings.ollama_host)
    if parsed.hostname not in ["localhost", "127.0.0.1"]:
        logger.warning(
            "Ollama is exposed to network. "
            "Ensure firewall rules are configured."
        )
```

---

## 7. Plan Wdrożenia Krok po Kroku

### Krok 1: Przygotowanie Środowiska

**1.1. Sprawdź czy Ollama jest zainstalowana:**
```bash
ollama --version
```

**1.2. Uruchom Ollama (jeśli nie działa):**
```bash
ollama serve
```

**1.3. Pobierz wymagane modele:**
```bash
ollama pull mistral:7b
ollama pull gpt-oss:120b
ollama pull nomic-embed-text
```

**1.4. Zweryfikuj dostępność:**
```bash
curl http://localhost:11434/api/version
# Powinno zwrócić: {"version":"..."}
```

### Krok 2: Aktualizacja Konfiguracji

**2.1. Sprawdź `.env` file:**
```bash
# backend/.env lub .env w root
OLLAMA_HOST=http://localhost:11434
OLLAMA_FAST_MODEL=mistral:7b
OLLAMA_ACCURATE_MODEL=gpt-oss:120b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_FAST_TIMEOUT=15
OLLAMA_ACCURATE_TIMEOUT=240
OLLAMA_EMBEDDING_TIMEOUT=30
```

**2.2. Zweryfikuj `backend/config.py`:**
- Upewnij się, że wszystkie zmienne OLLAMA są zdefiniowane

### Krok 3: Implementacja OllamaService

**3.1. Utwórz/aktualizuj `backend/services/ollama_service.py`:**

```python
"""
PrawnikGPT Backend - Ollama Service (Enhanced)

Comprehensive service for Ollama API integration with:
- Health checks
- Model validation
- Structured outputs (JSON)
- Error recovery
- Resource management
"""

import asyncio
import json
import logging
import time
from typing import Any, Callable

import httpx

from backend.config import settings
from backend.services.exceptions import (
    OLLAMAUnavailableError,
    OLLAMATimeoutError,
    EmbeddingGenerationError,
    ModelNotFoundError,
    OutOfMemoryError
)

logger = logging.getLogger(__name__)


class OllamaService:
    """
    Singleton service for OLLAMA API integration.
    
    Manages connection, health checks, model validation, and error recovery.
    """
    
    def __init__(
        self,
        base_url: str | None = None,
        timeout_connect: int = 5,
        timeout_read: int = 300,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ):
        """Initialize OllamaService."""
        self.base_url = base_url or settings.ollama_host
        self.timeout_connect = timeout_connect
        self.timeout_read = timeout_read
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        
        # State
        self.is_available: bool = False
        self.available_models: list[str] = []
        
        # Private
        self._client: httpx.AsyncClient | None = None
        self._model_cache: dict[str, bool] = {}
        self._last_health_check: float = 0.0
        self._connection_lock = asyncio.Lock()
        self._concurrent_requests = Semaphore(3)  # Max 3 concurrent
        
        logger.info(f"OllamaService initialized: {self.base_url}")
    
    # ... implement all methods from sections 3 and 4 ...
```

**3.2. Zaimplementuj wszystkie metody publiczne:**
- `health_check()`
- `validate_model()`
- `generate_text()`
- `generate_text_structured()`
- `generate_embedding()`
- `list_models()`

**3.3. Zaimplementuj metody prywatne:**
- `_get_client()`
- `_retry_request()`
- `_validate_generation_params()`
- `_build_structured_system_prompt()`
- `_parse_json_response()`

### Krok 4: Integracja z Istniejącym Kodem

**4.1. Zaktualizuj `backend/services/llm_service.py`:**

Zastąp bezpośrednie wywołania `httpx` wywołaniami `OllamaService`:

```python
# Przed:
async with httpx.AsyncClient(timeout=timeout) as client:
    response = await client.post(...)

# Po:
from backend.services.ollama_service import get_ollama_service

service = get_ollama_service()
response = await service.generate_text(...)
```

**4.2. Zaktualizuj `backend/services/rag_pipeline.py`:**

Użyj `OllamaService` zamiast bezpośrednich wywołań API.

### Krok 5: Dodaj Structured Outputs

**5.1. Utwórz helper dla structured responses:**

```python
# backend/services/llm_service.py

async def generate_structured_response(
    question: str,
    legal_context: str,
    model: str = "mistral:7b"
) -> dict:
    """
    Generate structured JSON response for legal query.
    
    Returns:
        dict: {
            "answer": str,
            "sources": List[dict],
            "confidence": float
        }
    """
    from backend.services.ollama_service import get_ollama_service
    
    schema = {
        "type": "object",
        "properties": {
            "answer": {
                "type": "string",
                "description": "Odpowiedź na pytanie prawne"
            },
            "sources": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "act_title": {"type": "string"},
                        "article": {"type": "string"},
                        "chunk_id": {"type": "string"}
                    }
                }
            },
            "confidence": {
                "type": "number",
                "minimum": 0,
                "maximum": 1
            }
        },
        "required": ["answer", "sources", "confidence"]
    }
    
    prompt = build_prompt(question, legal_context)
    
    service = get_ollama_service()
    response = await service.generate_text_structured(
        prompt=prompt,
        model=model,
        json_schema=schema,
        system_prompt=SYSTEM_PROMPT
    )
    
    return response
```

### Krok 6: Testy

**6.1. Unit testy (`backend/tests/test_ollama_service.py`):**

```python
import pytest
from unittest.mock import AsyncMock, patch
from backend.services.ollama_service import OllamaService
from backend.services.exceptions import OLLAMAUnavailableError

@pytest.mark.asyncio
async def test_health_check_success():
    service = OllamaService(base_url="http://localhost:11434")
    
    with patch("httpx.AsyncClient") as mock_client:
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
        
        result = await service.health_check()
        assert result is True

@pytest.mark.asyncio
async def test_health_check_failure():
    service = OllamaService(base_url="http://localhost:11434")
    
    with patch("httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get.side_effect = httpx.ConnectError("Connection refused")
        
        result = await service.health_check()
        assert result is False

@pytest.mark.asyncio
async def test_generate_text_structured():
    service = OllamaService(base_url="http://localhost:11434")
    
    schema = {"type": "object", "properties": {"answer": {"type": "string"}}}
    
    with patch.object(service, "generate_text") as mock_generate:
        mock_generate.return_value = '{"answer": "Test response"}'
        
        result = await service.generate_text_structured(
            prompt="Test",
            model="mistral:7b",
            json_schema=schema
        )
        
        assert result == {"answer": "Test response"}
```

**6.2. Integration testy (wymaga działającego Ollama):**

```python
@pytest.mark.integration
@pytest.mark.asyncio
async def test_generate_text_integration():
    """Requires Ollama running locally."""
    service = OllamaService(base_url="http://localhost:11434")
    
    # Check health first
    if not await service.health_check():
        pytest.skip("Ollama not available")
    
    response = await service.generate_text(
        prompt="What is 2+2?",
        model="mistral:7b",
        timeout=15
    )
    
    assert len(response) > 0
    assert "4" in response or "cztery" in response.lower()
```

### Krok 7: Dokumentacja i Monitoring

**7.1. Dodaj logging:**
- Wszystkie metody powinny logować ważne operacje
- Użyj poziomów: DEBUG (szczegóły), INFO (operacje), WARNING (błędy niekrytyczne), ERROR (błędy krytyczne)

**7.2. Dodaj metryki (opcjonalnie):**
```python
# Track generation times
self._generation_times: list[float] = []

async def generate_text(self, ...):
    start = time.time()
    try:
        result = await self._generate_text_internal(...)
        elapsed = time.time() - start
        self._generation_times.append(elapsed)
        return result
    finally:
        # Log metrics
        if len(self._generation_times) > 100:
            avg_time = sum(self._generation_times) / len(self._generation_times)
            logger.info(f"Average generation time: {avg_time:.2f}s")
            self._generation_times.clear()
```

### Krok 8: Deployment Checklist

**Przed wdrożeniem:**

- [ ] Ollama jest zainstalowana i działa
- [ ] Wszystkie modele są pobrane (`ollama list`)
- [ ] `.env` zawiera poprawne `OLLAMA_HOST`
- [ ] Health check działa (`curl http://localhost:11434/api/version`)
- [ ] Unit testy przechodzą (`pytest backend/tests/test_ollama_service.py`)
- [ ] Integration testy przechodzą (jeśli Ollama dostępna)
- [ ] Logging jest skonfigurowany
- [ ] Error handling jest przetestowany (symulacja błędów)

**Dla distributed deployment:**

- [ ] Firewall rules są skonfigurowane (port 11434)
- [ ] Ollama binduje do `0.0.0.0` (nie tylko `127.0.0.1`)
- [ ] `OLLAMA_HOST` wskazuje na poprawny adres IP
- [ ] Test połączenia z maszyny A do maszyny B

---

## 8. Przykłady Użycia

### 8.1. Podstawowe Generowanie Tekstu

```python
from backend.services.ollama_service import get_ollama_service

service = get_ollama_service()

# Sprawdź dostępność
if not await service.health_check():
    raise OLLAMAUnavailableError("Ollama is down")

# Generuj odpowiedź
response = await service.generate_text(
    prompt="Co to jest umowa o pracę?",
    model="mistral:7b",
    system_prompt="Jesteś ekspertem prawnym...",
    temperature=0.3,
    timeout=15
)
```

### 8.2. Structured Output (JSON)

```python
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
        }
    },
    "required": ["answer", "sources"]
}

response = await service.generate_text_structured(
    prompt="Co to jest umowa o pracę?",
    model="mistral:7b",
    json_schema=schema,
    system_prompt="Jesteś ekspertem prawnym..."
)

# response = {
#     "answer": "Umowa o pracę to...",
#     "sources": [{"act_title": "Kodeks pracy", "article": "Art. 29"}]
# }
```

### 8.3. Generowanie Embeddingów

```python
embedding = await service.generate_embedding(
    text="Kodeks cywilny",
    model="nomic-embed-text"
)

# embedding = [0.123, -0.456, ..., 0.789]  # 768 dimensions
```

### 8.4. Walidacja Modelu

```python
if not await service.validate_model("mistral:7b"):
    raise ValueError(
        "Model mistral:7b not found. "
        "Run: ollama pull mistral:7b"
    )
```

---

## 9. Troubleshooting

### Problem: "Connection refused"

**Rozwiązanie:**
```bash
# Sprawdź czy Ollama działa
ps aux | grep ollama

# Uruchom Ollama
ollama serve

# Sprawdź port
netstat -tlnp | grep 11434
```

### Problem: "Model not found"

**Rozwiązanie:**
```bash
# Sprawdź dostępne modele
ollama list

# Pobierz brakujący model
ollama pull mistral:7b
```

### Problem: "Timeout"

**Rozwiązanie:**
- Zwiększ timeout w `.env`: `OLLAMA_ACCURATE_TIMEOUT=300`
- Użyj szybszego modelu: `mistral:7b` zamiast `gpt-oss:120b`
- Zmniejsz kontekst: `num_ctx=2048` zamiast `4096`

### Problem: "Out of memory"

**Rozwiązanie:**
- Użyj mniejszego modelu
- Zmniejsz `num_ctx`
- Zamknij inne aplikacje
- Zwiększ swap space (jeśli używasz CPU)

---

## 10. Podsumowanie

Plan wdrożenia Ollama Service obejmuje:

1. ✅ **Kompleksową usługę** z zarządzaniem połączeniami i health checks
2. ✅ **Obsługę structured outputs** (JSON) z walidacją schematu
3. ✅ **Zaawansowaną obsługę błędów** dla środowiska lokalnego
4. ✅ **Zarządzanie zasobami** (pamięć, timeouty, retry logic)
5. ✅ **Szczegółowy plan wdrożenia** krok po kroku
6. ✅ **Przykłady użycia** i troubleshooting

Usługa jest gotowa do integracji z istniejącym kodem FastAPI i zapewnia niezawodną komunikację z lokalnym serwisem Ollama.

