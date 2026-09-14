"""
User Model Definition.
Stores user authentication credentials, role assignments, and account status.
"""

import uuid
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """SQLAlchemy model representing a system user."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=False, index=True)
    department = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)

    wireguard_client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("wireguard_clients.id", ondelete="SET NULL", use_alter=True, name="fk_users_wireguard_client_id"),
        nullable=True,
    )

    # Relationships
    role = relationship("Role", back_populates="users")
    wireguard_client = relationship(
        "WireGuardClient",
        foreign_keys=[wireguard_client_id],
        post_update=True,
        uselist=False,
    )
    sessions = relationship("VPNSession", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    access_violations = relationship("AccessViolation", back_populates="user")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(username='{self.username}', email='{self.email}', department='{self.department}')>"
