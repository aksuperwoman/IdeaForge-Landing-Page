#!/usr/bin/env bash
# IdeaForge — Mac/Linux launcher
# Creates a venv if needed, installs deps, and runs the FastAPI server.
set -e
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "[setup] creating virtual environment..."
  python3 -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate
echo "[setup] installing dependencies..."
python -m pip install -q -r requirements.txt

if [ ! -f ".env" ]; then
  echo "[warn] .env not found. Copying from .env.example — edit it to add your NVIDIA_API_KEY."
  cp .env.example .env
fi

echo
echo "[run] starting IdeaForge on http://localhost:8000"
echo
uvicorn backend.main:app --reload --port 8000
