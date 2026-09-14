"""
WireGuard VPN Router.
Exposes endpoints for peer configuration downloads, key regeneration, and interface telemetry.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas.wireguard import (
    WireGuardClientResponse,
    WireGuardConfigResponse,
    WireGuardPeerStatus,
    WireGuardStatusResponse,
)
from app.services import wireguard_service
from app.middleware.auth_middleware import get_current_user, get_current_admin_user

router = APIRouter(prefix="/api/wireguard", tags=["WireGuard"])


@router.post("/generate/{user_id}", response_model=WireGuardConfigResponse)
def generate_client_keys(
    user_id: UUID,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Generate or regenerate WireGuard keys for a user and synthesize configuration.
    Requires Admin privileges.
    """
    # Check user exists
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # If client already exists, regenerate keys
    client = target_user.wireguard_client
    if client:
        priv, pub = wireguard_service.generate_keypair()
        client.public_key = pub
        client.private_key_encrypted = wireguard_service.encrypt_key(priv)
        client.is_active = True
        db.commit()
        wireguard_service.register_peer(client, db)
    else:
        client = wireguard_service.provision_wireguard_client(user_id, db)

    return wireguard_service.generate_config(user_id, db)


@router.get("/config/{user_id}")
def get_client_config(
    user_id: UUID,
    download: Optional[bool] = Query(False, description="Download as raw .conf file"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve WireGuard configuration for client setup.
    Users can download their own configuration; Admins can access any user configuration.
    """
    # Permission check: current user must be Admin or the owner of the config
    if not current_user.is_admin and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this WireGuard configuration",
        )

    config = wireguard_service.generate_config(user_id, db)

    if download:
        return Response(
            content=config.content,
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename={config.filename}"},
        )

    return config


@router.get("/status", response_model=WireGuardStatusResponse)
def get_wireguard_status(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve WireGuard interface status, listening port, and active peer telemetry.
    Requires Admin privileges.
    """
    return wireguard_service.get_status(db)


@router.get("/peers", response_model=List[WireGuardPeerStatus])
def get_wireguard_peers(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve list of configured WireGuard peers with connection metrics.
    Requires Admin privileges.
    """
    status_resp = wireguard_service.get_status(db)
    return status_resp.peers


@router.delete("/peer/{user_id}")
def remove_wireguard_peer(
    user_id: UUID,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Remove peer from WireGuard interface and revoke active VPN tunnel access.
    Requires Admin privileges.
    """
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    success = wireguard_service.remove_peer(user_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="WireGuard client record not found for user")

    return {"message": f"Peer for user {target_user.username} successfully removed"}
