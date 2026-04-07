#!/usr/bin/env python3
"""
Frontend Server Startup Script
Run: python3 run-frontend.py
"""
import os
import subprocess
from pathlib import Path

# Get the project root
project_root = Path(__file__).parent
frontend_dir = project_root / "resilience-hub"


def get_npm_command() -> str:
    return "npm.cmd" if os.name == "nt" else "npm"

print("=" * 50)
print("  DRS Frontend Server Startup")
print("=" * 50)
print()

# Change to frontend directory
os.chdir(frontend_dir)
npm_cmd = get_npm_command()

# Install dependencies if needed
print("Checking dependencies...")
if not (frontend_dir / "node_modules").exists():
    print("Installing Node.js dependencies...")
    subprocess.run([npm_cmd, "install"], check=False)
    print("✓ Dependencies installed")
    print()
else:
    print("✓ Dependencies already installed")
    print()

# Start dev server
print("Starting frontend development server...")
print("=" * 50)
print("Frontend running on: http://localhost:8080")
print("=" * 50)
print()

subprocess.run([npm_cmd, "run", "dev"], check=False)
