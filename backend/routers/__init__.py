"""
PrawnikGPT Backend - Routers Package

This package contains FastAPI routers (API endpoints) organized by domain.

Routers:
- health.py: Health check endpoint
- queries.py: Query management endpoints
- ratings.py: Rating management endpoints
- legal_acts.py: Legal acts endpoints
- onboarding.py: Onboarding endpoints
"""

from backend.routers import health, queries, ratings, legal_acts, onboarding

__all__ = ["health", "queries", "ratings", "legal_acts", "onboarding"]

