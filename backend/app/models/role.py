"""
Role Model Definition.
Represents organizational roles with allowed network micro-segments.
"""

import uuid
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Role(Base):
    """SQLAlchemy model for enterprise roles and network segment permissions."""

    __tablename__ = "roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    allowed_segments = Column(ARRAY(String), default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    users = relationship("User", back_populates="role")

    def __repr__(self):
        return f"<Role(name='{self.name}', allowed_segments={self.allowed_segments})>"
