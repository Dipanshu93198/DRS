#!/usr/bin/env python3
"""
Unified startup script for both backend and frontend.
This handles port forwarding and environment setup automatically.
"""
import os
import sys
import subprocess
import time
import socket
import shutil
from pathlib import Path

def is_port_open(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.3)
        return sock.connect_ex((host, port)) == 0


def get_npm_command() -> str:
    if os.name == "nt":
        return "npm.cmd"
    return "npm"


def main():
    project_root = Path(__file__).parent
    backend_dir = project_root / "backend"
    frontend_dir = project_root / "resilience-hub"
    frontend_port = 8080
    
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
    backend_process = None

    if not (backend_dir / "venv").exists():
        print("Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)

    backend_python = backend_dir / "venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")

    if is_port_open("127.0.0.1", 8000):
        print("Backend already running on port 8000. Reusing existing process.")
    else:
        subprocess.run([str(backend_python), "-m", "pip", "install", "-r", "requirements.txt", "-q"], check=False)
        backend_process = subprocess.Popen(
            [
                str(backend_python),
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "0.0.0.0",
                "--port",
                "8000",
                "--reload",
            ],
            cwd=backend_dir,
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
    
    npm_cmd = get_npm_command()
    if shutil.which(npm_cmd) is None:
        print(f"Error: {npm_cmd} not found in PATH.")
        if backend_process:
            backend_process.terminate()
        sys.exit(1)

    if not (frontend_dir / "node_modules").exists():
        print("Installing dependencies...")
        subprocess.run([npm_cmd, "install", "-q"], check=False)
    
    # Set environment variable for API base
    frontend_env = os.environ.copy()
    frontend_env["VITE_API_BASE"] = "/api"
    
    print(f"Frontend will connect to backend at: {backend_url}")
    print(f"Starting dev server on port {frontend_port}...")
    print()
    
    try:
        if is_port_open("127.0.0.1", frontend_port):
            print(f"Frontend already running on port {frontend_port}. Reusing existing process.")
        else:
            subprocess.run(
                [npm_cmd, "run", "dev"],
                env=frontend_env,
                cwd=frontend_dir
            )
    except KeyboardInterrupt:
        print("\nShutting down...")
        if backend_process:
            backend_process.terminate()
        sys.exit(0)

if __name__ == "__main__":
    main()
