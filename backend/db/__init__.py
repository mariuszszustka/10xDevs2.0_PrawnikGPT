"""
PrawnikGPT Backend - Database Package

This package contains database-related utilities and repository pattern implementations.

Modules:
- supabase_client.py: Supabase client setup and connection management
- queries.py: Query history repository (CRUD operations)
- ratings.py: Ratings repository (CRUD operations)
- legal_acts.py: Legal acts repository (CRUD, search, relations)
"""

from backend.db.supabase_client import (
    SupabaseClient,
    get_supabase,
    check_database_health
)
from backend.db import queries, ratings, legal_acts

__all__ = [
    "SupabaseClient",
    "get_supabase",
    "check_database_health",
    "queries",
    "ratings",
    "legal_acts"
]
