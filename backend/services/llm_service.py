"""
PrawnikGPT Backend - LLM Service

Text generation using OLLAMA models.
Provides fast and accurate response generation for legal queries.

Models:
- Fast: mistral:7b (<15s target)
- Accurate: gpt-oss:120b (<240s target)

Features:
- Prompt templating
- Token management
- Streaming support (optional)
- Timeout handling
- Error recovery
"""

import logging
import time
import httpx
from typing import Optional, Dict, Any, List

from backend.config import settings
from backend.services.exceptions import (
    OLLAMAUnavailableError,
    OLLAMATimeoutError,
    GenerationTimeoutError
)

logger = logging.getLogger(__name__)


# =========================================================================
# CONFIGURATION
# =========================================================================

# Model names
FAST_MODEL = settings.ollama_fast_model  # mistral:7b
ACCURATE_MODEL = settings.ollama_accurate_model  # gpt-oss:120b

# Timeouts (seconds)
FAST_TIMEOUT = settings.ollama_fast_timeout  # 15s
ACCURATE_TIMEOUT = settings.ollama_accurate_timeout  # 240s

# Generation parameters
DEFAULT_TEMPERATURE = 0.3  # Lower for more factual responses
DEFAULT_TOP_P = 0.9
DEFAULT_TOP_K = 40


# =========================================================================
# PROMPT TEMPLATES
# =========================================================================

SYSTEM_PROMPT = """Jesteś ekspertem prawnym specjalizującym się w polskim prawie. 
Twoim zadaniem jest udzielanie precyzyjnych odpowiedzi na pytania prawne w oparciu 
o dostarczone fragmenty aktów prawnych.

Zasady odpowiadania:
1. Opieraj odpowiedź TYLKO na dostarczonych fragmentach aktów prawnych
2. Cytuj konkretne artykuły i przepisy
3. Używaj jasnego, zrozumiałego języka
4. Jeśli informacje są niepełne, wskaż to wprost
5. Nie wymyślaj informacji spoza dostarczonego kontekstu
"""

USER_PROMPT_TEMPLATE = """Pytanie użytkownika:
{question}

Dostępne akty prawne i przepisy:
{legal_context}

Na podstawie powyższych przepisów, udziel zwięzłej i precyzyjnej odpowiedzi na pytanie użytkownika. 
Pamiętaj o cytowaniu konkretnych artykułów."""


# =========================================================================
# PROMPT CONSTRUCTION
# =========================================================================

def build_legal_context(chunks: List[Dict[str, Any]], related_acts: List[Dict[str, Any]]) -> str:
    """
    Build legal context string from chunks and related acts.
    
    Args:
        chunks: List of relevant text chunks with metadata
        related_acts: List of related legal acts
        
    Returns:
        str: Formatted legal context for prompt
    """
    context_parts = []
    
    # Group chunks by legal act
    acts_chunks = {}
    for chunk in chunks:
        act_id = chunk.get("legal_act_id")
        if act_id:
            if act_id not in acts_chunks:
                acts_chunks[act_id] = []
            acts_chunks[act_id].append(chunk)
    
    # Format each act with its chunks
    for act_id, act_chunks in acts_chunks.items():
        # Get act title from chunk metadata
        if act_chunks and "legal_act" in act_chunks[0]:
            act_info = act_chunks[0]["legal_act"]
            act_title = act_info.get("title", "Akt prawny")
            
            context_parts.append(f"\n=== {act_title} ===\n")
            
            # Add chunks
            for chunk in act_chunks:
                content = chunk.get("content", "")
                chunk_index = chunk.get("chunk_index", 0)
                context_parts.append(f"[Fragment {chunk_index + 1}]\n{content}\n")
    
    # Add related acts info (optional)
    if related_acts:
        context_parts.append("\n=== Powiązane akty prawne ===\n")
        for act in related_acts[:5]:  # Limit to 5
            title = act.get("title", "")
            context_parts.append(f"- {title}\n")
    
    return "\n".join(context_parts)


def build_prompt(question: str, legal_context: str) -> str:
    """
    Build complete prompt from question and context.
    
    Args:
        question: User's legal question
        legal_context: Formatted legal context
        
    Returns:
        str: Complete prompt for LLM
    """
    return USER_PROMPT_TEMPLATE.format(
        question=question,
        legal_context=legal_context
    )


# =========================================================================
# TEXT GENERATION
# =========================================================================

async def generate_text(
    prompt: str,
    model: str,
    timeout: int,
    temperature: float = DEFAULT_TEMPERATURE,
    system_prompt: Optional[str] = None,
    stream: bool = False
) -> str:
    """
    Generate text using OLLAMA model.
    
    Args:
        prompt: Input prompt
        model: Model name (fast or accurate)
        timeout: Timeout in seconds
        temperature: Sampling temperature (0-1)
        system_prompt: Optional system prompt
        stream: Whether to stream response (not implemented yet)
        
    Returns:
        str: Generated text
        
    Raises:
        OLLAMAUnavailableError: If OLLAMA service unavailable
        OLLAMATimeoutError: If generation times out
        GenerationTimeoutError: If specific timeout exceeded
        
    Example:
        ```python
        response = await generate_text(
            prompt="Explain contract law",
            model="mistral:7b",
            timeout=15
        )
        ```
    """
    # Validation
    if not prompt or len(prompt.strip()) == 0:
        raise ValueError("Prompt cannot be empty")
    
    start_time = time.time()
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            # Build request payload
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": stream,
                "options": {
                    "temperature": temperature,
                    "top_p": DEFAULT_TOP_P,
                    "top_k": DEFAULT_TOP_K
                }
            }
            
            # Add system prompt if provided
            if system_prompt:
                payload["system"] = system_prompt
            
            logger.info(
                f"Starting generation with {model} "
                f"(timeout={timeout}s, temp={temperature})"
            )
            
            # Send request
            response = await client.post(
                f"{settings.ollama_host}/api/generate",
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"OLLAMA error: HTTP {response.status_code}")
                raise OLLAMAUnavailableError(
                    f"OLLAMA generation failed: HTTP {response.status_code}"
                )
            
            # Parse response
            data = response.json()
            generated_text = data.get("response", "")
            
            if not generated_text:
                logger.error("Empty response from OLLAMA")
                raise OLLAMAUnavailableError("OLLAMA returned empty response")
            
            generation_time = time.time() - start_time
            logger.info(
                f"Generation completed: {len(generated_text)} chars "
                f"in {generation_time:.2f}s with {model}"
            )
            
            return generated_text.strip()
            
    except httpx.TimeoutException:
        generation_time = time.time() - start_time
        logger.error(f"Generation timeout after {generation_time:.2f}s with {model}")
        
        if model == FAST_MODEL:
            raise GenerationTimeoutError(
                f"Fast generation timed out after {timeout}s"
            )
        else:
            raise OLLAMATimeoutError(
                f"Accurate generation timed out after {timeout}s"
            )
    
    except httpx.ConnectError:
        logger.error(f"Cannot connect to OLLAMA service: {settings.ollama_host}")
        raise OLLAMAUnavailableError("OLLAMA service unavailable")
    
    except (OLLAMAUnavailableError, GenerationTimeoutError):
        raise  # Re-raise our custom errors
    
    except Exception as e:
        logger.error(f"Unexpected error during generation: {e}")
        raise OLLAMAUnavailableError(f"Generation failed: {e}")


async def generate_text_fast(
    prompt: str,
    system_prompt: Optional[str] = SYSTEM_PROMPT
) -> tuple[str, int]:
    """
    Generate fast response using small model.
    
    Args:
        prompt: Input prompt
        system_prompt: Optional system prompt (defaults to SYSTEM_PROMPT)
        
    Returns:
        tuple[str, int]: (generated_text, generation_time_ms)
        
    Raises:
        GenerationTimeoutError: If exceeds 15s timeout
        OLLAMAUnavailableError: If service unavailable
    """
    start_time = time.time()
    
    text = await generate_text(
        prompt=prompt,
        model=FAST_MODEL,
        timeout=FAST_TIMEOUT,
        temperature=DEFAULT_TEMPERATURE,
        system_prompt=system_prompt
    )
    
    generation_time_ms = int((time.time() - start_time) * 1000)
    
    return text, generation_time_ms


async def generate_text_accurate(
    prompt: str,
    system_prompt: Optional[str] = SYSTEM_PROMPT
) -> tuple[str, int]:
    """
    Generate accurate response using large model.
    
    Args:
        prompt: Input prompt
        system_prompt: Optional system prompt (defaults to SYSTEM_PROMPT)
        
    Returns:
        tuple[str, int]: (generated_text, generation_time_ms)
        
    Raises:
        OLLAMATimeoutError: If exceeds 240s timeout
        OLLAMAUnavailableError: If service unavailable
    """
    start_time = time.time()
    
    text = await generate_text(
        prompt=prompt,
        model=ACCURATE_MODEL,
        timeout=ACCURATE_TIMEOUT,
        temperature=DEFAULT_TEMPERATURE,
        system_prompt=system_prompt
    )
    
    generation_time_ms = int((time.time() - start_time) * 1000)
    
    return text, generation_time_ms


# =========================================================================
# SOURCE EXTRACTION (from generated response)
# =========================================================================

def extract_sources_from_response(
    response_text: str,
    chunks: List[Dict[str, Any]]
) -> List[Dict[str, str]]:
    """
    Extract source references from generated response.
    
    Attempts to match cited articles/paragraphs with source chunks.
    
    Args:
        response_text: Generated response text
        chunks: Original chunks used for generation
        
    Returns:
        List[Dict]: Source references with act_title, article, link, chunk_id
        
    Note:
        This is a basic implementation. In production, use NLP for better matching.
    """
    sources = []
    seen_acts = set()
    
    # For now, extract sources from chunks (simple approach)
    # TODO: Implement NLP-based citation extraction from response_text
    
    for chunk in chunks:
        if "legal_act" in chunk:
            act = chunk["legal_act"]
            act_id = act.get("id")
            
            # Avoid duplicates
            if act_id and act_id not in seen_acts:
                seen_acts.add(act_id)
                
                # Build ISAP link (placeholder - adjust based on actual URL structure)
                year = act.get("year", "")
                position = act.get("position", "")
                link = f"https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU{year}{position:04d}"
                
                sources.append({
                    "act_title": act.get("title", ""),
                    "article": f"Fragment {chunk.get('chunk_index', 0) + 1}",
                    "link": link,
                    "chunk_id": chunk.get("id", "")
                })
    
    return sources[:10]  # Limit to 10 sources


# =========================================================================
# HELPER FUNCTIONS
# =========================================================================

def estimate_token_count(text: str) -> int:
    """
    Estimate token count for text.
    
    Rough approximation: 1 token ≈ 4 characters for Polish text.
    
    Args:
        text: Input text
        
    Returns:
        int: Estimated token count
    """
    return len(text) // 4


def truncate_context_if_needed(
    context: str,
    max_tokens: int = 4000
) -> str:
    """
    Truncate context if too long.
    
    Args:
        context: Legal context string
        max_tokens: Maximum tokens allowed
        
    Returns:
        str: Truncated context (if needed)
    """
    estimated_tokens = estimate_token_count(context)
    
    if estimated_tokens <= max_tokens:
        return context
    
    # Truncate to fit (rough)
    max_chars = max_tokens * 4
    truncated = context[:max_chars]
    
    logger.warning(
        f"Context truncated: {estimated_tokens} → {max_tokens} tokens"
    )
    
    return truncated + "\n\n[... treść skrócona ...]"

