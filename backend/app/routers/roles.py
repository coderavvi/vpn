"""
Role Management Router.
Provides endpoints for creating, updating, and querying enterprise roles.
"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas.role import RoleCreate, RoleUpdate, RoleResponse
from app.services import rbac_service
from app.middleware.auth_middleware import get_current_user, get_current_admin_user

router = APIRouter(prefix="/api/roles", tags=["Roles"])


@router.get("", response_model=List[RoleResponse])
def list_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all available enterprise roles and permissions."""
    roles = rbac_service.get_roles(db)
    responses = []
    for r in roles:
        responses.append(
            RoleResponse(
                id=r.id,
                name=r.name,
                description=r.description,
                allowed_segments=r.allowed_segments or [],
                created_at=r.created_at,
                user_count=len(r.users) if r.users else 0,
            )
        )
    return responses


@router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(
    payload: RoleCreate,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Create a new role with segment permissions. Requires Admin privileges."""
    role = rbac_service.create_role(db, payload, admin_user)
    return RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        allowed_segments=role.allowed_segments or [],
        created_at=role.created_at,
        user_count=0,
    )


@router.put("/{id}", response_model=RoleResponse)
def update_role(
    id: UUID,
    payload: RoleUpdate,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Update role details and network segment access. Requires Admin privileges."""
    role = rbac_service.update_role(db, id, payload, admin_user)
    return RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        allowed_segments=role.allowed_segments or [],
        created_at=role.created_at,
        user_count=len(role.users) if role.users else 0,
    )
