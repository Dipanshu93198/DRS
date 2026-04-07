import os
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
from app.routers import auth

try:
    from app.config import settings
    from app.database import init_db
    from app.routers import resources, dispatch, ai, sos, disaster, infrastructure, simulation, logging, operations, public, gov_feeds, sms_alerts
    from app.websockets.manager import handle_websocket
except ImportError:
    from config import settings
    from database import init_db
    from routers import resources, dispatch, ai, sos, disaster
    from websockets.manager import handle_websocket

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Initializing database...")
    init_db()
    print("Application started successfully")
    yield
    # Shutdown
    print("Application shutdown")


# Create FastAPI app
app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    version=settings.api_version,
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(resources.router)
app.include_router(dispatch.router)
app.include_router(disaster.router)
app.include_router(ai.router)
app.include_router(sos.router)
app.include_router(auth.router)
app.include_router(infrastructure.router)
app.include_router(simulation.router)
app.include_router(logging.router)
app.include_router(operations.router)
app.include_router(public.router)
app.include_router(gov_feeds.router)
app.include_router(sms_alerts.router)
default_uploads_dir = "/tmp/uploads" if os.getenv("VERCEL") else (Path(__file__).resolve().parents[1] / "uploads").as_posix()
uploads_dir = Path(os.getenv("UPLOADS_DIR", default_uploads_dir))
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Disaster Response and Coordination System",
        "version": settings.api_version,
        "docs": "/docs",
        "api_url": "http://localhost:8000"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.websocket("/ws/resources")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time resource updates"""
    await handle_websocket(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
