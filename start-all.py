#!/usr/bin/env python3
"""
Unified startup script for both backend and frontend.
This handles port forwarding and environment setup automatically.
"""
import os
import sys
import subprocess
import time
from pathlib import Path

def main():
    project_root = Path(__file__).parent
    backend_dir = project_root / "backend"
    frontend_dir = project_root / "resilience-hub"
    
    print("=" * 70)
    print("  DRS - COMPLETE STARTUP SCRIPT")
    print("=" * 70)
    print()
    
    # Detect environment
    is_codespaces = "CODESPACES" in os.environ
    is_wsl = "WSL_DISTRO_NAME" in os.environ
    is_local = not (is_codespaces or is_wsl)
    
    print(f"Environment: {'GitHub Codespaces' if is_codespaces else 'WSL' if is_wsl else 'Local'}")
    print()
    
    # Determine backend URL
    if is_codespaces:
        # codespaces provide a preview host but it's sometimes unreliable;
        # we'll forward the port and have the frontend talk to localhost:8000 instead.
        backend_url = "http://127.0.0.1:8000"
        preview = os.environ.get("CODESPACE_NAME")
        if preview:
            print(f"Codespaces detected - preview domain would be: https://{preview}-8000.githubpreview.dev")
        print(f"Backend will be accessible on localhost:8000 (forwarded port)")
    else:
        backend_url = "http://127.0.0.1:8000"
        print(f"Using local backend: {backend_url}")
    
    print()
    print("=" * 70)
    print("  STARTING BACKEND (Python FastAPI)")
    print("=" * 70)
    print()
    # If running in GitHub Codespaces, try to forward port 8000 automatically
    if is_codespaces:
        try:
            codespace = os.environ.get("CODESPACE_NAME")
            print("Forwarding backend port 8000 via gh CLI...")
            if codespace:
                subprocess.run(['gh', 'codespace', 'ports', 'forward', '8000:8000', '-c', codespace], check=False)
            else:
                # fallback to interactive if name not available
                subprocess.run(['gh', 'codespace', 'ports', 'forward', '8000:8000'], check=False)
        except FileNotFoundError:
            # gh not installed or not on PATH; ignore
            pass
    
    # Start backend
    os.chdir(backend_dir)
    
    if not (backend_dir / "venv").exists():
        print("Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)
    
    # Activate venv and start backend
    if os.name == 'nt':  # Windows
        activate_cmd = str(backend_dir / "venv" / "Scripts" / "activate")
        backend_cmd = f"{activate_cmd} && pip install -r requirements.txt -q && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
        backend_process = subprocess.Popen(backend_cmd, shell=True)
    else:  # Unix/Linux/Mac
        backend_process = subprocess.Popen(
            ['bash', '-c', 
             f'source venv/bin/activate && pip install -r requirements.txt -q && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload'],
            cwd=backend_dir
        )
    
    print("Backend starting on port 8000...")
    time.sleep(3)  # Wait for backend to start
    
    print()
    print("=" * 70)
    print("  STARTING FRONTEND (React Vite)")
    print("=" * 70)
    print()
    
    # Start frontend with correct backend URL
    os.chdir(frontend_dir)
    
    if not (frontend_dir / "node_modules").exists():
        print("Installing dependencies...")
        subprocess.run(["npm", "install", "-q"], check=False)
    
    # Set environment variable for API base
    frontend_env = os.environ.copy()
    frontend_env["VITE_API_BASE"] = backend_url
    
    print(f"Frontend will connect to backend at: {backend_url}")
    print("Starting dev server on port 5173...")
    print()
    
    try:
        subprocess.run(
            ["npm", "run", "dev"],
            env=frontend_env,
            cwd=frontend_dir
        )
    except KeyboardInterrupt:
        print("\nShutting down...")
        backend_process.terminate()
        sys.exit(0)

if __name__ == "__main__":
    main()
