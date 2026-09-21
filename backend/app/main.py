"""
Main FastAPI Application Entrypoint.
Initializes middleware, background monitoring lifespans, routers, and health checks.
"""

import asyncio
import logging
import os
import subprocess
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User
from app.middleware.auth_middleware import get_current_admin_user
from app.middleware.vpn_required import VPNRequiredException
from app.routers import auth, users, roles, wireguard, sessions, logs, portals
from app.services import wireguard_service
from app.services.monitor_service import start_background_monitoring_loop

logger = logging.getLogger("main")


def validate_wireguard_server_pubkey() -> bool:
    """
    Startup validation check:
    Verifies that the server WireGuard public key is resolved (from settings / .env
    or the running WireGuard interface) and matches the live configuration.
    """
    expected_pubkey = (settings.WIREGUARD_SERVER_PUBKEY or settings.WIREGUARD_SERVER_PUBLIC_KEY or "").strip()
    active_pubkey = wireguard_service.get_server_public_key()

    # Query live kernel interface
    live_pubkey = None
    for cmd in (
        ["wg", "show", settings.WIREGUARD_INTERFACE, "public-key"],
        ["sudo", "-n", "wg", "show", settings.WIREGUARD_INTERFACE, "public-key"],
    ):
        try:
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode == 0 and res.stdout.strip():
                live_pubkey = res.stdout.strip()
                break
        except Exception:
            pass

    if live_pubkey and expected_pubkey and live_pubkey != expected_pubkey:
        msg = (
            f"WARNING: Active WireGuard interface public key ('{live_pubkey}') does not match "
            f"WIREGUARD_SERVER_PUBKEY in .env ('{expected_pubkey}'). "
            f"Client configs will use the key configured in .env."
        )
        logger.warning(msg)
        return False

    logger.info("WireGuard server public key successfully verified: %s", active_pubkey)
    return True


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    Launches background monitoring tasks upon startup and gracefully cancels upon shutdown.
    """
    validate_wireguard_server_pubkey()
    monitor_task = asyncio.create_task(start_background_monitoring_loop())
    yield
    monitor_task.cancel()
    try:
        await monitor_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise VPN with Role-Based Micro-Segmentation Backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


@app.exception_handler(VPNRequiredException)
async def vpn_required_exception_handler(request: Request, exc: VPNRequiredException):
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={
            "error": "VPN_REQUIRED",
            "message": "Access to this resource requires an active VPN connection. Connect to WireGuard and try again.",
            "your_ip": exc.client_ip,
            "required_network": "10.10.0.0/24",
        },
    )

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@wireguard.router.get("/server-info", tags=["WireGuard"])
def get_wireguard_server_info(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve WireGuard server info (admin only):
    - Server public key in use
    - Endpoint address written into client configs
    - Number of registered peers
    """
    return wireguard_service.get_server_info(db)


# Include All System Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(roles.router)
app.include_router(wireguard.router)
app.include_router(sessions.router)
app.include_router(logs.router)
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
