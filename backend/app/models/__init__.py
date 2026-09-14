"""
Models package initialization.
Exports all SQLAlchemy database models for easy import and Alembic discovery.
"""

from app.database import Base
from app.models.role import Role
from app.models.user import User
from app.models.wireguard import WireGuardClient
from app.models.session import VPNSession
from app.models.audit import AuditLog
from app.models.violation import AccessViolation
from app.models.token import RefreshToken

__all__ = [
    "Base",
    "Role",
    "User",
    "WireGuardClient",
    "VPNSession",
    "AuditLog",
    "AccessViolation",
    "RefreshToken",
]
