"""
Pytest configuration for integration tests.

This file sets up the Python path before any test imports.
"""

import sys
from pathlib import Path

# Add backend directory to Python path for imports
# This allows tests to use: from backend.xxx import yyy
backend_dir = Path(__file__).parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

