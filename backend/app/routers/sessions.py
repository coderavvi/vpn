"""
VPN Sessions Router.
Exposes administrative endpoints to inspect active and historical VPN connections.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, VPNSession
from app.schemas.session import VPNSessionResponse, SessionListResponse, SessionUserBasic
from app.schemas.auth import RoleBasic
from app.services import session_service
from app.middleware.auth_middleware import get_current_admin_user

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


def _format_session(session: VPNSession) -> VPNSessionResponse:
    """Helper to convert VPNSession model to VPNSessionResponse."""
    user_basic = None
    if session.user:
        role_basic = None
        if session.user.role:
            role_basic = RoleBasic(
                id=session.user.role.id,
                name=session.user.role.name,
                description=session.user.role.description,
                allowed_segments=session.user.role.allowed_segments or [],
            )
        user_basic = SessionUserBasic(
            id=session.user.id,
            username=session.user.username,
            email=session.user.email,
            department=session.user.department,
            role=role_basic,
        )

    return VPNSessionResponse(
        id=session.id,
        user_id=session.user_id,
        user=user_basic,
        wireguard_client_id=session.wireguard_client_id,
        session_start=session.session_start,
        session_end=session.session_end,
        client_real_ip=str(session.client_real_ip) if session.client_real_ip else None,
        assigned_vpn_ip=str(session.assigned_vpn_ip) if session.assigned_vpn_ip else None,
        duration_seconds=session.duration_seconds,
        bytes_transferred=session.bytes_transferred or 0,
        is_active=session.is_active,
        disconnect_reason=session.disconnect_reason,
    )


@router.get("", response_model=SessionListResponse)
def list_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    is_active: Optional[bool] = Query(None),
    user_id: Optional[UUID] = Query(None),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """List VPN sessions with pagination and active state filter. Requires Admin privileges."""
    sessions, total = session_service.get_sessions(
        db=db,
        skip=skip,
        limit=limit,
        is_active=is_active,
        user_id=user_id,
    )
    return SessionListResponse(
        total=total,
        items=[_format_session(s) for s in sessions],
    )


@router.get("/active", response_model=List[VPNSessionResponse])
def get_active_sessions(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """List all currently active VPN tunnel sessions. Requires Admin privileges."""
    active = session_service.get_active_sessions(db)
    return [_format_session(s) for s in active]


@router.post("/disconnect/{session_id}", response_model=VPNSessionResponse)
def disconnect_session(
    session_id: UUID,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Force disconnect an active VPN session. Requires Admin privileges."""
    session = session_service.disconnect_session(db, session_id, admin_user)
    return _format_session(session)
