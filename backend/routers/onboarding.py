"""
PrawnikGPT Backend - Onboarding Endpoint

Public endpoint for example questions to help users get started.
Returns pre-defined example questions categorized by legal domain.
"""

import logging
from fastapi import APIRouter

from backend.models.onboarding import (
    ExampleQuestionsResponse,
    ExampleQuestion
)

logger = logging.getLogger(__name__)

# Create router (public endpoint - no auth required)
router = APIRouter(
    prefix="/api/v1/onboarding",
    tags=["onboarding"]
)

# Static example questions (hardcoded for MVP)
# In production, these could come from database or CMS
EXAMPLE_QUESTIONS = [
    # Consumer Rights (5 questions)
    ExampleQuestion(
        id=1,
        question="Jakie mam prawa jako konsument przy zakupie wadliwego produktu?",
        category="consumer_rights"
    ),
    ExampleQuestion(
        id=2,
        question="Czy mogę odstąpić od umowy zakupu online w ciągu 14 dni?",
        category="consumer_rights"
    ),
    ExampleQuestion(
        id=3,
        question="Jak reklamować usługę, która nie została wykonana zgodnie z umową?",
        category="consumer_rights"
    ),
    ExampleQuestion(
        id=4,
        question="Jakie są moje prawa przy opóźnieniu w dostawie zamówionego towaru?",
        category="consumer_rights"
    ),
    ExampleQuestion(
        id=5,
        question="Czy sprzedawca może odmówić zwrotu pieniędzy za wadliwy produkt?",
        category="consumer_rights"
    ),
    
    # Civil Law (5 questions)
    ExampleQuestion(
        id=6,
        question="Jakie są warunki ważności umowy sprzedaży nieruchomości?",
        category="civil_law"
    ),
    ExampleQuestion(
        id=7,
        question="Czy mogę wypowiedzieć umowę najmu mieszkania przed terminem?",
        category="civil_law"
    ),
    ExampleQuestion(
        id=8,
        question="Jak długo trwa przedawnienie roszczeń z tytułu umowy?",
        category="civil_law"
    ),
    ExampleQuestion(
        id=9,
        question="Jakie są konsekwencje niewykonania zobowiązania umownego?",
        category="civil_law"
    ),
    ExampleQuestion(
        id=10,
        question="Czy można dochodzić odszkodowania za naruszenie dóbr osobistych?",
        category="civil_law"
    ),
    
    # Labor Law (5 questions)
    ExampleQuestion(
        id=11,
        question="Jakie są okresy wypowiedzenia umowy o pracę na czas nieokreślony?",
        category="labor_law"
    ),
    ExampleQuestion(
        id=12,
        question="Czy pracodawca może zwolnić pracownika w czasie zwolnienia lekarskiego?",
        category="labor_law"
    ),
    ExampleQuestion(
        id=13,
        question="Ile wynosi minimalne wynagrodzenie za urlop wypoczynkowy?",
        category="labor_law"
    ),
    ExampleQuestion(
        id=14,
        question="Jakie są zasady rozliczania czasu pracy w godzinach nadliczbowych?",
        category="labor_law"
    ),
    ExampleQuestion(
        id=15,
        question="Czy mogę odmówić wykonania polecenia służbowego?",
        category="labor_law"
    ),
    
    # Criminal Law (5 questions)
    ExampleQuestion(
        id=16,
        question="Jakie są granice obrony koniecznej w prawie karnym?",
        category="criminal_law"
    ),
    ExampleQuestion(
        id=17,
        question="Kiedy przestępstwo ulega przedawnieniu?",
        category="criminal_law"
    ),
    ExampleQuestion(
        id=18,
        question="Jakie są różnice między kradzieżą a przywłaszczeniem?",
        category="criminal_law"
    ),
    ExampleQuestion(
        id=19,
        question="Czy można umorzyć postępowanie karne warunkowo?",
        category="criminal_law"
    ),
    ExampleQuestion(
        id=20,
        question="Jakie są kary za prowadzenie pojazdu pod wpływem alkoholu?",
        category="criminal_law"
    ),
]


# =========================================================================
# GET /api/v1/onboarding/example-questions - Get Example Questions
# =========================================================================

@router.get(
    "/example-questions",
    response_model=ExampleQuestionsResponse,
    summary="Get example questions",
    description="""
    Get list of example questions to help users get started.
    
    Public endpoint (no authentication required).
    
    Returns 20 pre-defined questions across 4 legal categories:
    - consumer_rights: Consumer protection questions (5)
    - civil_law: Civil law questions (5)
    - labor_law: Labor law questions (5)
    - criminal_law: Criminal law questions (5)
    
    These questions serve as:
    - Onboarding guide for new users
    - Examples of proper query formulation
    - Quick access to common legal topics
    
    For MVP, questions are static (hardcoded).
    In production, they could come from database or CMS.
    """,
    responses={
        200: {"description": "Example questions retrieved successfully"}
    }
)
async def get_example_questions():
    """
    Get example questions for onboarding.
    
    Returns:
        ExampleQuestionsResponse: List of 20 example questions
    """
    logger.info("Fetching example questions for onboarding")
    
    return ExampleQuestionsResponse(
        examples=EXAMPLE_QUESTIONS
    )

