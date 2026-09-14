"""
Role-Based Access Control (RBAC) Service Module.
Manages enterprise roles, segment access permissions, and authorization checks.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Role, User
from app.schemas.role import RoleCreate, RoleUpdate
from app.services.auth_service import log_audit_event


def get_roles(db: Session) -> List[Role]:
    """Retrieve all defined roles."""
    return db.query(Role).order_by(Role.name).all()


def get_role_by_id(db: Session, role_id: UUID) -> Optional[Role]:
    """Retrieve role by primary key UUID."""
    return db.query(Role).filter(Role.id == role_id).first()


def get_role_by_name(db: Session, name: str) -> Optional[Role]:
    """Retrieve role by unique name."""
    return db.query(Role).filter(Role.name == name).first()


def create_role(db: Session, role_in: RoleCreate, admin_user: User) -> Role:
    """Create a new role with assigned network segment permissions."""
    existing = get_role_by_name(db, role_in.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role with name '{role_in.name}' already exists",
        )

    role = Role(
        name=role_in.name,
        description=role_in.description,
        allowed_segments=role_in.allowed_segments,
    )
    db.add(role)
    db.commit()
    db.refresh(role)

    log_audit_event(
        db=db,
        event_type="ROLE_CREATED",
        description=f"Admin {admin_user.username} created role '{role.name}' with segments {role.allowed_segments}",
        user_id=admin_user.id,
        severity="INFO",
    )
    return role


def update_role(db: Session, role_id: UUID, role_in: RoleUpdate, admin_user: User) -> Role:
    """Update an existing role's name, description, or allowed segments."""
    role = get_role_by_id(db, role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    if role_in.name and role_in.name != role.name:
        existing = get_role_by_name(db, role_in.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role with name '{role_in.name}' already exists",
            )
        role.name = role_in.name

    if role_in.description is not None:
        role.description = role_in.description

    if role_in.allowed_segments is not None:
        role.allowed_segments = role_in.allowed_segments

    db.commit()
    db.refresh(role)

    log_audit_event(
        db=db,
        event_type="ROLE_UPDATED",
        description=f"Admin {admin_user.username} updated role '{role.name}'",
        user_id=admin_user.id,
        severity="INFO",
    )
    return role


def check_user_permission(user: User, required_segment: str) -> bool:
    """Verify whether a user is authorized to access a given network segment."""
    if user.is_admin:
        return True
    if not user.role or not user.role.allowed_segments:
        return False
    return required_segment in user.role.allowed_segments
