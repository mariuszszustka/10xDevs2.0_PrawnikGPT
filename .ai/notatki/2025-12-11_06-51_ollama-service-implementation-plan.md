# Sesja: Plan Wdrożenia Ollama Service (Local LLM)

**Data:** 2025-12-11
**Czas:** 06:51
**Asystent:** Auto (Cursor AI)

---

## 📋 Cel sesji

Stworzenie kompleksowego planu wdrożenia usługi Ollama Service dla lokalnego interfejsu API Ollama. Usługa ma zapewnić pełną integrację z lokalnym serwisem LLM, w tym obsługę structured outputs (JSON), zarządzanie połączeniami, health checks oraz zaawansowaną obsługę błędów specyficzną dla środowiska lokalnego.

---

## 🎯 Wykonane zadania

### 1. Analiza istniejącego kodu

#### Przegląd istniejących implementacji
- **`backend/services/ollama_service.py`**: Podstawowa implementacja z `OLLAMAClient`, health checks i generowaniem embeddingów
- **`backend/services/llm_service.py`**: Implementacja generowania tekstu z podstawową obsługą błędów
- **`backend/config.py`**: Konfiguracja z ustawieniami OLLAMA (host, modele, timeouty)
- **`backend/services/exceptions.py`**: Hierarchia wyjątków dla obsługi błędów

#### Zidentyfikowane braki
- Brak obsługi structured outputs (JSON format)
- Ograniczona obsługa błędów dla środowiska lokalnego (cold start, OOM, model not found)
- Brak retry logic z exponential backoff
- Brak zarządzania connection pooling
- Brak walidacji modeli przed użyciem
- Brak cache'owania health checks i listy modeli

### 2. Stworzenie kompleksowego planu wdrożenia

#### Struktura dokumentu
Utworzono dokument `.ai/ollama-service-implementation-plan.md` zawierający:

**1. Opis usługi (Local Inference Service)**
- Architektura systemu z diagramem
- Cel i zakres usługi
- Integracja z FastAPI backend

**2. Opis konstruktora (Inicjalizacja klienta Ollama/URL bazowego)**
- Klasa `OllamaService` jako singleton
- Parametry inicjalizacji (base_url, timeouty, retry logic)
- Pola publiczne i prywatne
- Przykład użycia singleton pattern

**3. Publiczne metody i pola**
- `health_check()` - sprawdzanie dostępności z cache'owaniem
- `validate_model()` - walidacja dostępności modelu
- `generate_text()` - podstawowe generowanie tekstu
- `generate_text_structured()` - generowanie JSON z walidacją schematu
- `generate_embedding()` - generowanie wektorów embedding
- `list_models()` - lista dostępnych modeli

**4. Prywatne metody i pola**
- `_get_client()` - lazy initialization klienta HTTP
- `_retry_request()` - retry logic z exponential backoff
- `_validate_generation_params()` - walidacja parametrów generowania
- `_build_structured_system_prompt()` - budowanie promptu z JSON schema
- `_parse_json_response()` - parsowanie i walidacja JSON

**5. Obsługa błędów (Specyficzna dla Self-Hosted)**
Szczegółowe scenariusze błędów i rozwiązania:
- **Ollama nie jest uruchomiona**: Connection refused, health check failure
- **Model nie został pobrany**: HTTP 404, komunikat z instrukcją `ollama pull`
- **Timeout przy generowaniu**: Model-specific timeouts, adaptive timeouts
- **Brak pamięci RAM (OOM)**: Wykrywanie i sugestie (mniejszy model, redukcja kontekstu)
- **Nieprawidłowy format JSON**: Parsowanie z fallback, walidacja schematu
- **Cold start modelu**: Warmup mechanism dla szybszego pierwszego użycia

**6. Kwestie bezpieczeństwa i wydajności**
- **Zarządzanie pamięcią RAM**: Lazy loading, monitoring, ograniczenie kontekstu
- **Zarządzanie połączeniami HTTP**: Connection pooling, rate limiting
- **Timeout management**: Model-specific timeouts, adaptive timeouts
- **Caching i optymalizacja**: Cache health checks, cache listy modeli
- **Bezpieczeństwo lokalne**: Walidacja że Ollama nie jest publicznie dostępna

**7. Plan wdrożenia krok po kroku**
8 szczegółowych kroków:
1. Przygotowanie środowiska (instalacja Ollama, pobranie modeli)
2. Aktualizacja konfiguracji (.env, config.py)
3. Implementacja OllamaService (wszystkie metody)
4. Integracja z istniejącym kodem (llm_service.py, rag_pipeline.py)
5. Dodanie structured outputs (helper functions)
6. Testy (unit i integration)
7. Dokumentacja i monitoring
8. Deployment checklist

### 3. Kluczowe funkcjonalności

#### Structured Outputs (JSON Format)
**Dwa podejścia:**
1. **Parametr `format: 'json'`** (rekomendowane) - natywne wsparcie Ollama
2. **Schema w System Prompt** (fallback) - wstrzyknięcie schematu JSON do promptu systemowego

**Przykład użycia:**
```python
schema = {
    "type": "object",
    "properties": {
        "answer": {"type": "string"},
        "sources": {"type": "array", "items": {...}},
        "confidence": {"type": "number"}
    }
}

response = await service.generate_text_structured(
    prompt="Co to jest umowa o pracę?",
    model="mistral:7b",
    json_schema=schema
)
```

#### System Prompt i User Prompt
- **System Prompt**: Definicja roli modelu (ekspert prawny)
- **User Prompt**: Pytanie użytkownika + kontekst prawny
- **Enhanced System Prompt**: Dla structured outputs - system prompt + instrukcje JSON schema

#### Parametry modelu
- **temperature**: 0.3 (niższa dla bardziej faktualnych odpowiedzi)
- **top_p**: 0.9 (nucleus sampling)
- **top_k**: 40 (top-k sampling)
- **num_ctx**: Rozmiar okna kontekstu (dostosowany do modelu)
- **seed**: Opcjonalny seed dla reprodukowalności

#### Nazwy modeli
- **Fast model**: `mistral:7b` (<15s target)
- **Accurate model**: `gpt-oss:120b` (<240s target)
- **Embedding model**: `nomic-embed-text` (768-dim vectors)

### 4. Obsługa błędów - szczegóły implementacji

#### Health Check z Cache'owaniem
```python
HEALTH_CHECK_CACHE_TTL = 30  # seconds

async def health_check(self, force: bool = False) -> bool:
    if not force:
        elapsed = time.time() - self._last_health_check
        if elapsed < HEALTH_CHECK_CACHE_TTL:
            return self.is_available
    # ... perform check ...
```

#### Retry Logic z Exponential Backoff
```python
wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
await asyncio.sleep(wait_time)
```

#### Walidacja Modelu z Cache'owaniem
- Sprawdzenie cache przed wywołaniem API
- Aktualizacja cache po sprawdzeniu
- Komunikat błędu z instrukcją `ollama pull`

### 5. Zarządzanie zasobami

#### Connection Pooling
```python
httpx.AsyncClient(
    limits=httpx.Limits(
        max_keepalive_connections=5,
        max_connections=10
    )
)
```

#### Rate Limiting (na poziomie aplikacji)
```python
self._concurrent_requests = Semaphore(3)  # Max 3 concurrent
```

#### Model-Specific Timeouts
```python
MODEL_TIMEOUTS = {
    "mistral:7b": 15,
    "gpt-oss:120b": 240,
    "nomic-embed-text": 30
}
```

---

## 📝 Szczegóły techniczne

### Architektura
```
FastAPI Backend
    ↓
OllamaService (Singleton)
    ↓ HTTP/REST
Ollama Service (localhost:11434)
    - mistral:7b
    - gpt-oss:120b
    - nomic-embed-text
```

### Deployment Scenarios
Plan uwzględnia różne scenariusze wdrożenia:
- **All-in-one**: Wszystko na localhost
- **Distributed**: Frontend/Backend na jednej maszynie, Ollama na drugiej
- **Cloud**: Wszystkie komponenty w chmurze
- **Hybrid**: Mieszana konfiguracja

### Integration Points
- `backend/services/llm_service.py` - użycie OllamaService zamiast bezpośrednich wywołań httpx
- `backend/services/rag_pipeline.py` - integracja z RAG pipeline
- `backend/routers/queries.py` - endpointy API używające usługi

---

## ✅ Rezultat

Utworzono kompleksowy plan wdrożenia w pliku:
**`.ai/ollama-service-implementation-plan.md`**

Plan zawiera:
- ✅ Szczegółowy opis wszystkich komponentów
- ✅ Przykłady kodu dla każdej funkcjonalności
- ✅ Obsługę błędów dla 6 scenariuszy
- ✅ Zarządzanie zasobami (pamięć, połączenia, timeouty)
- ✅ 8-krokowy plan wdrożenia
- ✅ Przykłady użycia i troubleshooting
- ✅ Deployment checklist

Plan jest gotowy do użycia przez developera i zawiera wszystkie niezbędne informacje do prawidłowego wdrożenia usługi.

---

## 🔄 Następne kroki

1. **Implementacja OllamaService** zgodnie z planem
2. **Aktualizacja istniejącego kodu** (llm_service.py, rag_pipeline.py)
3. **Dodanie structured outputs** dla ustrukturyzowanych odpowiedzi
4. **Testy** (unit i integration)
5. **Monitoring i logging** w produkcji

---

## 📚 Zasoby

- **Dokumentacja Ollama API**: https://github.com/ollama/ollama/blob/main/docs/api.md
- **JSON Schema**: https://json-schema.org/
- **httpx Documentation**: https://www.python-httpx.org/

---

**Status:** ✅ Ukończone
**Plik:** `.ai/ollama-service-implementation-plan.md`

