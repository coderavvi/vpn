"""
VPN Enforcement Middleware.
Enforces that client requests to department portal endpoints originate from the WireGuard VPN network (10.10.0.0/24).
"""

import ipaddress
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, Request, Depends, status
from sqlalchemy.orm import Session
from jose import jwt

from app.config import settings
from app.database import get_db
from app.models import AccessViolation, AuditLog


class VPNRequiredException(HTTPException):
    """Exception raised when a client attempts to access a VPN-restricted endpoint without an active VPN tunnel."""

    def __init__(self, client_ip: str):
        self.client_ip = client_ip
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "VPN_REQUIRED",
                "message": "Access to this resource requires an active VPN connection. Connect to WireGuard and try again.",
                "your_ip": client_ip,
                "required_network": "10.10.0.0/24",
            },
        )


def get_client_ip(request: Request) -> str:
    """
    Extract the real client IP from the request.
    Checks in this order:
    1. X-Forwarded-For header (first IP in the list)
    2. X-Real-IP header
    3. request.client.host as the final fallback
    """
    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        first_ip = x_forwarded_for.split(",")[0].strip()
        if first_ip:
            return first_ip

    x_real_ip = request.headers.get("X-Real-IP")
    if x_real_ip and x_real_ip.strip():
        return x_real_ip.strip()

    if request.client and request.client.host:
        return request.client.host

    return "127.0.0.1"


def get_user_id_from_request(request: Request) -> Optional[UUID]:
    """Extract user_id from Bearer JWT in Authorization header if present."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub = payload.get("sub")
        if sub:
            return UUID(sub)
    except Exception:
        return None
    return None


def sanitize_ip(ip_str: Optional[str]) -> Optional[str]:
    """Validate and return IP string if syntactically valid for PostgreSQL INET."""
    if not ip_str:
        return None
    try:
        ipaddress.ip_address(ip_str)
        return ip_str
    except ValueError:
        return None


async def require_vpn_connection(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    FastAPI dependency to enforce that the client is connected to the WireGuard VPN (10.10.0.0/24).
    If not connected, logs violations to access_violations and audit_logs, then returns HTTP 403.
    """
    client_ip_str = get_client_ip(request)

    vpn_network = ipaddress.ip_network("10.10.0.0/24")
    try:
        client_ip = ipaddress.ip_address(client_ip_str)
        is_vpn = client_ip in vpn_network
    except ValueError:
        is_vpn = False

    if is_vpn:
        return client_ip_str

    # Extract user_id from JWT if available
    user_id = get_user_id_from_request(request)

    # Determine destination port based on endpoint path
    path = request.url.path.lower()
    if "/hr" in path:
        dest_port = 9001
    elif "/finance" in path:
        dest_port = 9002
    elif "/it" in path:
        dest_port = 9003
    else:
        dest_port = 8000

    valid_ip_for_db = sanitize_ip(client_ip_str)

    # a) Log violation to access_violations table
    violation = AccessViolation(
        user_id=user_id,
        vpn_client_ip=valid_ip_for_db,
        destination_ip=None,
        destination_port=dest_port,
        protocol="HTTP",
        violation_type="VPN_BYPASS_ATTEMPT",
        action_taken="BLOCKED",
        nftables_rule_matched="API_MIDDLEWARE_VPN_CHECK",
    )
    db.add(violation)

    # b) Log to audit_logs table
    audit_entry = AuditLog(
        user_id=user_id,
        event_type="UNAUTHORIZED_ACCESS",
        severity="WARNING",
        description=f"Portal access blocked — request from {client_ip_str} did not originate from VPN tunnel (10.10.0.0/24)",
        ip_address=valid_ip_for_db,
    )
    db.add(audit_entry)
    db.commit()

    # c) Return HTTP 403
    raise VPNRequiredException(client_ip=client_ip_str)
