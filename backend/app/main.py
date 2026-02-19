from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

try:
    from app.config import settings
    from app.database import init_db
    from app.routers import resources, dispatch, ai, sos, disaster
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
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION,
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(resources.router)
app.include_router(dispatch.router)
app.include_router(disaster.router)
app.include_router(ai.router)
app.include_router(sos.router)


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Disaster Response and Coordination System",
        "version": settings.API_VERSION,
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
