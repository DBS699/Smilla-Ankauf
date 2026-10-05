# Vercel entry point - serves the unchanged FastAPI app from backend/server.py
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from server import app  # noqa: E402,F401
