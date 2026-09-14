"""
Main FastAPI Application Entrypoint.
Initializes middleware, routers, and health check endpoints.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, users, roles, wireguard, portals

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise VPN with Role-Based Micro-Segmentation Backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(roles.router)
app.include_router(wireguard.router)
app.include_router(portals.router)


@app.get("/")
def health_check():
    """Root health check endpoint returning system status."""
    return {"status": "ok"}


@app.get("/api/health")
def api_health():
    """API health check endpoint."""
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
    }
