"""
Access Violation Model Definition.
Records network-level micro-segmentation access violations blocked by nftables.
"""

import uuid
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class AccessViolation(Base):
    """SQLAlchemy model for unauthorized network access attempts."""

    __tablename__ = "access_violations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    vpn_client_ip = Column(INET().with_variant(String(45), "sqlite"), nullable=True, index=True)
    destination_ip = Column(INET().with_variant(String(45), "sqlite"), nullable=False)
    destination_port = Column(Integer, nullable=False)
    protocol = Column(String(10), default="TCP")
    violation_type = Column(String(50), nullable=False)
    action_taken = Column(String(50), default="DROP", nullable=False)
    nftables_rule_matched = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User", back_populates="access_violations")

    def __repr__(self):
        return (
            f"<AccessViolation(client='{self.vpn_client_ip}', dest='{self.destination_ip}:{self.destination_port}', "
            f"action='{self.action_taken}')>"
        )
