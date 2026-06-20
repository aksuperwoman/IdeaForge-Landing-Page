@echo off
REM IdeaForge — Windows launcher
REM Creates a venv if needed, installs deps, and runs the FastAPI server.
setlocal

cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo [setup] creating virtual environment...
  python -m venv .venv
)

call ".venv\Scripts\activate.bat"
echo [setup] installing dependencies...
python -m pip install -q -r requirements.txt

if not exist ".env" (
  echo [warn] .env not found. Copying from .env.example — edit it to add your NVIDIA_API_KEY.
  copy .env.example .env >nul
)

echo.
echo [run] starting IdeaForge on http://localhost:8000
echo.
uvicorn backend.main:app --reload --port 8000
