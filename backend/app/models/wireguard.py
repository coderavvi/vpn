"""
WireGuard Client Model Definition.
Stores client cryptographic keys, assigned internal IP, and traffic metrics.
"""

import uuid
from sqlalchemy import Column, String, Text, Boolean, BigInteger, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class WireGuardClient(Base):
    """SQLAlchemy model for WireGuard client configuration and telemetry."""

    __tablename__ = "wireguard_clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    public_key = Column(Text, unique=True, nullable=False)
    private_key_encrypted = Column(Text, nullable=False)
    preshared_key_encrypted = Column(Text, nullable=True)
    assigned_ip = Column(INET().with_variant(String(45), "sqlite"), unique=True, nullable=False, index=True)
    config_file_content = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_handshake = Column(DateTime(timezone=True), nullable=True)
    bytes_sent = Column(BigInteger, default=0)
    bytes_received = Column(BigInteger, default=0)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    sessions = relationship("VPNSession", back_populates="wireguard_client", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<WireGuardClient(user_id='{self.user_id}', assigned_ip='{self.assigned_ip}', is_active={self.is_active})>"
