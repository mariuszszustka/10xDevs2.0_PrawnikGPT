"""
PrawnikGPT Backend - Integration Tests

Integration tests that use real database connections and services.
These tests require:
- Supabase running (local or remote)
- Environment variables configured
- Migrations applied

Run with:
    pytest backend/tests/integration/ -v -m integration
"""

import sys
import os
from pathlib import Path

# Add backend directory to Python path for imports
backend_dir = Path(__file__).parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

