"""
VPN Session Pydantic Schemas.
Request and response models for session monitoring and active tunnel tracking.
"""

from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.auth import RoleBasic


class SessionUserBasic(BaseModel):
    """Basic user information embedded in session objects."""

    id: UUID
    username: str
    email: str
    department: str
    role: Optional[RoleBasic] = None

    model_config = ConfigDict(from_attributes=True)


class VPNSessionResponse(BaseModel):
    """Schema representing VPN tunnel session state."""

    id: UUID
    user_id: UUID
    user: Optional[SessionUserBasic] = None
    wireguard_client_id: UUID
    session_start: Optional[datetime] = None
    session_end: Optional[datetime] = None
    client_real_ip: Optional[str] = None
    assigned_vpn_ip: Optional[str] = None
    duration_seconds: Optional[int] = None
    bytes_transferred: int = 0
    is_active: bool = True
    disconnect_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SessionListResponse(BaseModel):
    """Schema for paginated session records."""

    total: int
    items: List[VPNSessionResponse]
