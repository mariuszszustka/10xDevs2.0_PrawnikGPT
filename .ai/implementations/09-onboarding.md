# 13. GET /api/v1/onboarding/example-questions

**Endpoint:** `GET /api/v1/onboarding/example-questions`  
**Typ:** Onboarding - Static Content  
**Autentykacja:** Nie wymagana (publiczny)  
**Złożoność:** Bardzo niska  
**Czas:** 30 minut

---

## Przegląd

Zwraca przykładowe pytania dla nowych użytkowników. Statyczna zawartość (hardcoded w MVP).

**Charakterystyka:**
- Publiczny endpoint
- Bez bazy danych
- Instant response (<50ms)
- Static data

---

## Response (200 OK)

```json
{
  "examples": [
    {
      "id": 1,
      "question": "Jakie są podstawowe prawa konsumenta w Polsce?",
      "category": "consumer_rights"
    },
    {
      "id": 2,
      "question": "Co to jest przedawnienie w prawie cywilnym?",
      "category": "civil_law"
    },
    {
      "id": 3,
      "question": "Jakie są zasady zwrotu towaru kupionego online?",
      "category": "consumer_rights"
    },
    {
      "id": 4,
      "question": "Czym różni się umowa zlecenia od umowy o pracę?",
      "category": "labor_law"
    }
  ]
}
```

---

## Implementacja

### Pydantic Models

```python
# backend/models/onboarding.py
from pydantic import BaseModel
from typing import List, Literal

CategoryType = Literal["consumer_rights", "civil_law", "labor_law", "criminal_law"]

class ExampleQuestion(BaseModel):
    id: int
    question: str
    category: CategoryType

class ExampleQuestionsResponse(BaseModel):
    examples: List[ExampleQuestion]
```

### Static Data

```python
# backend/routers/onboarding.py
from fastapi import APIRouter
from models.onboarding import ExampleQuestionsResponse, ExampleQuestion

router = APIRouter(prefix="/api/v1/onboarding", tags=["Onboarding"])

# Static example questions (MVP)
EXAMPLE_QUESTIONS = [
    ExampleQuestion(
        id=1,
        question="Jakie są podstawowe prawa konsumenta w Polsce?",
        category="consumer_rights"
    ),
    ExampleQuestion(
        id=2,
        question="Co to jest przedawnienie w prawie cywilnym?",
        category="civil_law"
    ),
    ExampleQuestion(
        id=3,
        question="Jakie są zasady zwrotu towaru kupionego online?",
        category="consumer_rights"
    ),
    ExampleQuestion(
        id=4,
        question="Czym różni się umowa zlecenia od umowy o pracę?",
        category="labor_law"
    ),
    ExampleQuestion(
        id=5,
        question="Co to jest legalna obrona w prawie karnym?",
        category="criminal_law"
    ),
    ExampleQuestion(
        id=6,
        question="Jakie są prawa najemcy w umowie najmu mieszkania?",
        category="civil_law"
    ),
]

@router.get(
    "/example-questions",
    response_model=ExampleQuestionsResponse,
    status_code=200,
    responses={
        200: {
            "description": "List of example questions for onboarding",
        }
    }
)
async def get_example_questions():
    """
    Get example questions for new users.
    
    Returns a curated list of example legal questions to help users
    get started with the system.
    
    **Categories:**
    - consumer_rights: Prawa konsumenta
    - civil_law: Prawo cywilne
    - labor_law: Prawo pracy
    - criminal_law: Prawo karne
    """
    return ExampleQuestionsResponse(examples=EXAMPLE_QUESTIONS)
```

---

## Future Enhancements (Post-MVP)

### Database Storage

Jeśli w przyszłości przykładowe pytania będą dynamiczne:

```sql
CREATE TABLE example_questions (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_example_questions_active_order 
    ON example_questions(is_active, display_order);
```

### Personalization

Można dodać personalizację na podstawie profilu użytkownika:
- Częściej używane kategorie
- Historia zapytań
- Lokalizacja (różne regiony Polski)

### A/B Testing

Testowanie różnych zestawów pytań:
- Tracking click-through rate
- Analiza konwersji (kliknięcie → submitted query)

---

## Checklist

- [ ] Pydantic models (ExampleQuestion, ExampleQuestionsResponse)
- [ ] Static data (EXAMPLE_QUESTIONS list)
- [ ] Router endpoint
- [ ] Tests (verify structure, categories)
- [ ] OpenAPI documentation

---

## Testowanie

```python
# backend/tests/test_onboarding.py
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_get_example_questions():
    """Test example questions endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/onboarding/example-questions")
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify structure
    assert "examples" in data
    assert len(data["examples"]) > 0
    
    # Verify first question
    first_question = data["examples"][0]
    assert "id" in first_question
    assert "question" in first_question
    assert "category" in first_question
    
    # Verify categories are valid
    valid_categories = {"consumer_rights", "civil_law", "labor_law", "criminal_law"}
    for question in data["examples"]:
        assert question["category"] in valid_categories
```

---

## Integracja z Frontendem

### Example UI (React Component)

```typescript
// src/components/onboarding/ExampleQuestions.tsx
import { useEffect, useState } from 'react';
import type { ExampleQuestion } from '@/lib/types';

export function ExampleQuestions() {
  const [examples, setExamples] = useState<ExampleQuestion[]>([]);

  useEffect(() => {
    fetch('/api/v1/onboarding/example-questions')
      .then(res => res.json())
      .then(data => setExamples(data.examples));
  }, []);

  const handleQuestionClick = (question: string) => {
    // Populate query input with selected question
    onSubmitQuery(question);
  };

  return (
    <div className="example-questions">
      <h3>Przykładowe pytania:</h3>
      <div className="questions-grid">
        {examples.map(ex => (
          <button
            key={ex.id}
            className="question-card"
            onClick={() => handleQuestionClick(ex.question)}
          >
            {ex.question}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

**Powrót do:** [Index](../api-implementation-index.md)

