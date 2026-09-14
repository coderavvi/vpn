"""
Audit and Security Logs Router.
Exposes endpoints to query system audit events, firewall access violations, and threat metrics.
"""

from typing import List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, AuditLog, AccessViolation, VPNSession
from app.schemas.log import (
    AuditLogResponse,
    AccessViolationResponse,
    LogsSummaryResponse,
)
from app.schemas.session import SessionUserBasic
from app.schemas.auth import RoleBasic
from app.middleware.auth_middleware import get_current_admin_user

router = APIRouter(prefix="/api/logs", tags=["Logs"])


def _format_user_basic(user: Optional[User]) -> Optional[SessionUserBasic]:
    """Helper to convert User model to SessionUserBasic."""
    if not user:
        return None
    role_basic = None
    if user.role:
        role_basic = RoleBasic(
            id=user.role.id,
            name=user.role.name,
            description=user.role.description,
            allowed_segments=user.role.allowed_segments or [],
        )
    return SessionUserBasic(
        id=user.id,
        username=user.username,
        email=user.email,
        department=user.department,
        role=role_basic,
    )


@router.get("/audit", response_model=List[AuditLogResponse])
def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    event_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Retrieve security audit events. Requires Admin privileges."""
    query = db.query(AuditLog)

    if event_type:
        query = query.filter(AuditLog.event_type.ilike(f"%{event_type}%"))

    if severity:
        query = query.filter(AuditLog.severity == severity.upper())

    if search:
        query = query.filter(
            AuditLog.description.ilike(f"%{search}%") | AuditLog.event_type.ilike(f"%{search}%")
        )

    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

    return [
        AuditLogResponse(
            id=l.id,
            user_id=l.user_id,
            user=_format_user_basic(l.user),
            event_type=l.event_type,
            description=l.description,
            ip_address=str(l.ip_address) if l.ip_address else None,
            user_agent=l.user_agent,
            severity=l.severity,
            created_at=l.created_at,
        )
        for l in logs
    ]


@router.get("/violations", response_model=List[AccessViolationResponse])
def get_access_violations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Retrieve micro-segmentation access violations. Requires Admin privileges."""
    query = db.query(AccessViolation)

    if search:
        query = query.filter(
            AccessViolation.violation_type.ilike(f"%{search}%")
            | AccessViolation.destination_ip.cast(func.text).ilike(f"%{search}%")
        )

    violations = query.order_by(AccessViolation.created_at.desc()).offset(skip).limit(limit).all()

    return [
        AccessViolationResponse(
            id=v.id,
            user_id=v.user_id,
            user=_format_user_basic(v.user),
            vpn_client_ip=str(v.vpn_client_ip) if v.vpn_client_ip else None,
            destination_ip=str(v.destination_ip),
            destination_port=v.destination_port,
            protocol=v.protocol,
            violation_type=v.violation_type,
            action_taken=v.action_taken,
            nftables_rule_matched=v.nftables_rule_matched,
            created_at=v.created_at,
        )
        for v in violations
    ]


@router.get("/summary", response_model=LogsSummaryResponse)
def get_logs_summary(
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Retrieve summarized threat intelligence and security event metrics."""
    now = datetime.now(timezone.utc)
    yesterday = now - timedelta(hours=24)

    total_violations = db.query(AccessViolation).count()
    total_audit_events = db.query(AuditLog).count()
    recent_violations = (
        db.query(AccessViolation)
        .filter(AccessViolation.created_at >= yesterday)
        .count()
    )

    # Group violations by type
    violation_rows = (
        db.query(AccessViolation.violation_type, func.count(AccessViolation.id))
        .group_by(AccessViolation.violation_type)
        .all()
    )
    violations_by_type = {v_type: count for v_type, count in violation_rows}

    # Active sessions
    active_sessions = (
        db.query(VPNSession)
        .filter(VPNSession.is_active.is_(True))
        .count()
    )

    return LogsSummaryResponse(
        total_violations=total_violations,
        total_audit_events=total_audit_events,
        recent_violations_count_24h=recent_violations,
        violations_by_type=violations_by_type,
        active_sessions_count=active_sessions,
    )
