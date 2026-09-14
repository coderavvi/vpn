"""
User Management Pydantic Schemas.
Request and response models for user account creation, updates, and listings.
"""

from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.auth import RoleBasic


class UserBase(BaseModel):
    """Base schema attributes common across user models."""

    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=255)
    full_name: str = Field(..., min_length=1, max_length=255)
    department: str = Field(..., max_length=50)
    role_id: UUID = Field(..., description="Foreign key to assigned Role")
    is_admin: bool = Field(default=False)


class UserCreate(UserBase):
    """Schema for registering a new user."""

    password: str = Field(..., min_length=6, description="Plaintext password for account")


class UserUpdate(BaseModel):
    """Schema for updating existing user details."""

    email: Optional[str] = None
    full_name: Optional[str] = None
    department: Optional[str] = None
    role_id: Optional[UUID] = None
    password: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    """Schema representing user data returned by API."""

    id: UUID
    username: str
    email: str
    full_name: str
    department: str
    role_id: UUID
    role: Optional[RoleBasic] = None
    is_admin: bool
    is_active: bool
    wireguard_client_id: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    """Paginated or listed response of system users."""

    total: int
    items: List[UserResponse]
