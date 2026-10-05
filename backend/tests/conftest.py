"""
Pytest configuration for backend tests.
Ensures repository root and backend directory are always on sys.path.
"""
import sys
from pathlib import Path

# Add project root (c:\OceanEmbed) and backend directory to sys.path
_TESTS_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _TESTS_DIR.parent
_REPO_ROOT = _BACKEND_DIR.parent

for path in [str(_REPO_ROOT), str(_BACKEND_DIR)]:
    if path not in sys.path:
        sys.path.insert(0, path)
