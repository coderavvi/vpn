"""
Audit and Security Log Pydantic Schemas.
Request and response models for audit events, access violations, and metrics summaries.
"""

from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.session import SessionUserBasic


class AuditLogResponse(BaseModel):
    """Schema for audit event record."""

    id: UUID
    user_id: Optional[UUID] = None
    user: Optional[SessionUserBasic] = None
    event_type: str
    description: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    severity: str = "INFO"
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AccessViolationResponse(BaseModel):
    """Schema for firewall access violation event."""

    id: UUID
    user_id: Optional[UUID] = None
    user: Optional[SessionUserBasic] = None
    vpn_client_ip: Optional[str] = None
    destination_ip: str
    destination_port: int
    protocol: str = "TCP"
    violation_type: str
    action_taken: str = "DROP"
    nftables_rule_matched: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LogsSummaryResponse(BaseModel):
    """Schema for high-level security monitoring dashboard metrics."""

    total_violations: int
    total_audit_events: int
    recent_violations_count_24h: int
    violations_by_type: Dict[str, int] = {}
    active_sessions_count: int = 0
