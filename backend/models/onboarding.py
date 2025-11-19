"""
PrawnikGPT Backend - Onboarding Models

Pydantic models for onboarding endpoints:
- GET /api/v1/onboarding/example-questions

Example questions are static content for MVP (not stored in database).
Helps new users understand what kind of questions they can ask.
"""

from pydantic import BaseModel, Field
from typing import Literal, List


# =========================================================================
# TYPE ALIASES
# =========================================================================

QuestionCategory = Literal["consumer_rights", "civil_law", "labor_law", "criminal_law"]


# =========================================================================
# MODELS
# =========================================================================

class ExampleQuestion(BaseModel):
    """
    Example question for new users.
    
    Static content (not stored in database for MVP).
    Demonstrates the types of legal questions the system can answer.
    """
    id: int = Field(
        ...,
        ge=1,
        description="Question ID (sequential, for frontend key)"
    )
    question: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="Example question text in Polish"
    )
    category: QuestionCategory = Field(
        ...,
        description="Legal category of the question"
    )
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": 1,
                    "question": "Jakie są warunki zawarcia umowy sprzedaży nieruchomości?",
                    "category": "civil_law"
                },
                {
                    "id": 2,
                    "question": "Czy mogę odstąpić od umowy zawartej przez internet?",
                    "category": "consumer_rights"
                },
                {
                    "id": 3,
                    "question": "Jakie są wymogi formalne wypowiedzenia umowy o pracę?",
                    "category": "labor_law"
                }
            ]
        }
    }


class ExampleQuestionsResponse(BaseModel):
    """
    Response with list of example questions.
    
    GET /api/v1/onboarding/example-questions
    
    Returns curated list of example questions across different
    legal categories to guide new users.
    """
    examples: List[ExampleQuestion] = Field(
        ...,
        min_length=1,
        description="List of example questions (typically 8-12 questions)"
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "examples": [
                    {
                        "id": 1,
                        "question": "Jakie są warunki zawarcia umowy sprzedaży nieruchomości?",
                        "category": "civil_law"
                    },
                    {
                        "id": 2,
                        "question": "Czy mogę odstąpić od umowy zawartej przez internet?",
                        "category": "consumer_rights"
                    },
                    {
                        "id": 3,
                        "question": "Jakie są wymogi formalne wypowiedzenia umowy o pracę?",
                        "category": "labor_law"
                    },
                    {
                        "id": 4,
                        "question": "Kiedy można zastosować obronę konieczną?",
                        "category": "criminal_law"
                    }
                ]
            }
        }
    }

