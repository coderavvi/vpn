"""
WireGuard Pydantic Schemas.
Request and response models for WireGuard keys, peer telemetry, and client configs.
"""

from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class WireGuardClientResponse(BaseModel):
    """Schema representing WireGuard client status and assigned IP."""

    id: UUID
    user_id: UUID
    public_key: str
    assigned_ip: str
    is_active: bool
    created_at: Optional[datetime] = None
    last_handshake: Optional[datetime] = None
    bytes_sent: int = 0
    bytes_received: int = 0

    model_config = ConfigDict(from_attributes=True)


class WireGuardConfigResponse(BaseModel):
    """Schema containing generated WireGuard .conf file for client download."""

    user_id: UUID
    username: str
    filename: str
    content: str


class WireGuardPeerStatus(BaseModel):
    """Schema representing telemetry for an active WireGuard peer."""

    public_key: str
    assigned_ip: Optional[str] = None
    user_id: Optional[UUID] = None
    username: Optional[str] = None
    department: Optional[str] = None
    endpoint: Optional[str] = None
    latest_handshake: Optional[datetime] = None
    transfer_rx: int = 0
    transfer_tx: int = 0
    is_connected: bool = False


class WireGuardStatusResponse(BaseModel):
    """Schema for server-wide WireGuard interface status."""

    interface: str = "wg0"
    server_ip: str = "10.10.0.1"
    port: int = 51820
    public_key: str
    active_peers_count: int
    peers: List[WireGuardPeerStatus] = []
