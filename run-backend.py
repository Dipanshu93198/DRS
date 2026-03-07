#!/usr/bin/env python3
"""
Backend Server Startup Script
Run: python3 run-backend.py
"""
import os
import sys
import subprocess
from pathlib import Path

# Get the project root
project_root = Path(__file__).parent
backend_dir = project_root / "backend"

print("=" * 50)
print("  DRS Backend Server Startup")
print("=" * 50)
print()

# Change to backend directory
os.chdir(backend_dir)

# Create venv if it doesn't exist
venv_path = backend_dir / "venv"
if not venv_path.exists():
    print("Creating Python virtual environment...")
    subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)
    print("✓ Virtual environment created")
    print()

# Install requirements
print("Installing dependencies...")
if os.name == 'nt':  # Windows
    activate_script = str(venv_path / "Scripts" / "pip")
else:  # Unix/Linux/Mac
    activate_script = str(venv_path / "bin" / "pip")

subprocess.run([activate_script, "install", "-r", "requirements.txt", "-q"], check=False)
print("✓ Dependencies installed")
print()

# Start server
print("Starting backend server...")
print("=" * 50)
print("Server running on: http://localhost:8000")
print("API Docs: http://localhost:8000/docs")
print("Health Check: http://localhost:8000/health")
print("=" * 50)
print()

if os.name == 'nt':  # Windows
    activate_script = str(venv_path / "Scripts" / "uvicorn")
else:  # Unix/Linux/Mac
    activate_script = str(venv_path / "bin" / "uvicorn")

subprocess.run(
    [activate_script, "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
    check=False
)
