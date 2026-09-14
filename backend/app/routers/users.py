"""
User Management Router.
Provides administrative CRUD endpoints for user accounts and role assignments.
"""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse
from app.schemas.auth import RoleBasic
from app.services import user_service
from app.middleware.auth_middleware import get_current_admin_user

router = APIRouter(prefix="/api/users", tags=["Users"])


def _format_user_response(user: User) -> UserResponse:
    """Helper to convert User model to UserResponse schema."""
    role_basic = None
    if user.role:
        role_basic = RoleBasic(
            id=user.role.id,
            name=user.role.name,
            description=user.role.description,
            allowed_segments=user.role.allowed_segments or [],
        )

    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        department=user.department,
        role_id=user.role_id,
        role=role_basic,
        is_admin=user.is_admin,
        is_active=user.is_active,
        wireguard_client_id=user.wireguard_client_id,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login=user.last_login,
    )


@router.get("", response_model=UserListResponse)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    search: Optional[str] = Query(None),
    role_id: Optional[UUID] = Query(None),
    department: Optional[str] = Query(None),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """List users with filtering and pagination. Requires Admin privileges."""
    users, total = user_service.get_users(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
        role_id=role_id,
        department=department,
    )
    return UserListResponse(
        total=total,
        items=[_format_user_response(u) for u in users],
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Create a new user with role and provision WireGuard keypair. Requires Admin privileges."""
    user = user_service.create_user(db, payload, admin_user)
    return _format_user_response(user)


@router.get("/{id}", response_model=UserResponse)
def get_user(
    id: UUID,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Retrieve single user details. Requires Admin privileges."""
    user = user_service.get_user_by_id(db, id)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    return _format_user_response(user)


@router.put("/{id}", response_model=UserResponse)
def update_user(
    id: UUID,
    payload: UserUpdate,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Update user account attributes or role. Requires Admin privileges."""
    user = user_service.update_user(db, id, payload, admin_user)
    return _format_user_response(user)


@router.delete("/{id}")
def delete_user(
    id: UUID,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Delete a user account. Requires Admin privileges."""
    return user_service.delete_user(db, id, admin_user)


@router.post("/{id}/activate", response_model=UserResponse)
def activate_user(
    id: UUID,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Activate a deactivated user account. Requires Admin privileges."""
    user = user_service.activate_user(db, id, admin_user)
    return _format_user_response(user)


@router.post("/{id}/deactivate", response_model=UserResponse)
def deactivate_user(
    id: UUID,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Deactivate a user account to revoke access. Requires Admin privileges."""
    user = user_service.deactivate_user(db, id, admin_user)
    return _format_user_response(user)
