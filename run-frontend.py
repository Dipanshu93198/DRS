#!/usr/bin/env python3
"""
Frontend Server Startup Script
Run: python3 run-frontend.py
"""
import os
import sys
import subprocess
from pathlib import Path

# Get the project root
project_root = Path(__file__).parent
frontend_dir = project_root / "resilience-hub"

print("=" * 50)
print("  DRS Frontend Server Startup")
print("=" * 50)
print()

# Change to frontend directory
os.chdir(frontend_dir)

# Install dependencies if needed
print("Checking dependencies...")
if not (frontend_dir / "node_modules").exists():
    print("Installing Node.js dependencies...")
    subprocess.run(["npm", "install"], check=False)
    print("✓ Dependencies installed")
    print()
else:
    print("✓ Dependencies already installed")
    print()

# Start dev server
print("Starting frontend development server...")
print("=" * 50)
print("Frontend running on: http://localhost:5173")
print("=" * 50)
print()

subprocess.run(["npm", "run", "dev"], check=False)
