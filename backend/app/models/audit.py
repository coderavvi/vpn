"""
Audit Log Model Definition.
Records security-relevant actions, authentication events, and administrative activities.
"""

import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, INET, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class AuditLog(Base):
    """SQLAlchemy model for enterprise security audit logging."""

    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=False)
    ip_address = Column(INET().with_variant(String(45), "sqlite"), nullable=True)
    user_agent = Column(Text, nullable=True)
    event_metadata = Column(JSONB().with_variant(JSON, "sqlite"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    severity = Column(String(20), default="INFO")

    # Relationships
    user = relationship("User", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog(event_type='{self.event_type}', severity='{self.severity}', created_at='{self.created_at}')>"
