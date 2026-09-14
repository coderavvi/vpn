"""
VPN Session Service Module.
Manages session creation, duration tracking, telemetry synchronization, and disconnection.
"""

from typing import List, Optional, Tuple
from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import VPNSession, User, WireGuardClient
from app.services.auth_service import log_audit_event


def get_sessions(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    user_id: Optional[UUID] = None,
) -> Tuple[List[VPNSession], int]:
    """Retrieve session history with optional filtering."""
    query = db.query(VPNSession)

    if is_active is not None:
        query = query.filter(VPNSession.is_active == is_active)

    if user_id:
        query = query.filter(VPNSession.user_id == user_id)

    total = query.count()
    sessions = query.order_by(VPNSession.session_start.desc()).offset(skip).limit(limit).all()
    return sessions, total


def get_active_sessions(db: Session) -> List[VPNSession]:
    """Retrieve all currently active VPN sessions."""
    return (
        db.query(VPNSession)
        .filter(VPNSession.is_active.is_(True))
        .order_by(VPNSession.session_start.desc())
        .all()
    )


def disconnect_session(db: Session, session_id: UUID, admin_user: User) -> VPNSession:
    """Administratively terminate an active VPN session."""
    session = db.query(VPNSession).filter(VPNSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    now = datetime.now(timezone.utc)
    session.is_active = False
    session.session_end = now
    session.disconnect_reason = f"Terminated by Admin ({admin_user.username})"

    if session.session_start:
        session.duration_seconds = int((now - session.session_start).total_seconds())

    db.commit()
    db.refresh(session)

    log_audit_event(
        db=db,
        event_type="SESSION_DISCONNECTED",
        description=f"Admin {admin_user.username} disconnected session {session.id} for user {session.user.username if session.user else 'Unknown'}",
        user_id=admin_user.id,
        severity="WARNING",
    )
    return session
