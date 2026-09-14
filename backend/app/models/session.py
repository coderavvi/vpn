"""
VPN Session Model Definition.
Tracks active and historical user VPN connections and usage statistics.
"""

import uuid
from sqlalchemy import Column, String, Integer, Boolean, BigInteger, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class VPNSession(Base):
    """SQLAlchemy model representing an active or completed VPN tunnel session."""

    __tablename__ = "vpn_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    wireguard_client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("wireguard_clients.id", ondelete="CASCADE"),
        nullable=False,
    )
    session_start = Column(DateTime(timezone=True), server_default=func.now())
    session_end = Column(DateTime(timezone=True), nullable=True)
    client_real_ip = Column(INET().with_variant(String(45), "sqlite"), nullable=True)
    assigned_vpn_ip = Column(INET().with_variant(String(45), "sqlite"), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    bytes_transferred = Column(BigInteger, default=0)
    is_active = Column(Boolean, default=True, index=True)
    disconnect_reason = Column(String(50), nullable=True)

    # Relationships
    user = relationship("User", back_populates="sessions")
    wireguard_client = relationship("WireGuardClient", back_populates="sessions")

    def __repr__(self):
        return f"<VPNSession(id='{self.id}', user_id='{self.user_id}', is_active={self.is_active})>"
