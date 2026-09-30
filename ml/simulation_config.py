"""
Forwarding module to backend.app.core.simulation_config
"""
import sys
from pathlib import Path

# Add backend directory to path if not present
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.simulation_config import *
