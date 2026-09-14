"""
Authentication Pydantic Schemas.
Request and response models for authentication, token management, and user profiles.
"""

from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class LoginRequest(BaseModel):
    """Schema for user login credentials."""

    username: str = Field(..., description="Username or email address")
    password: str = Field(..., description="User plaintext password")


class RefreshTokenRequest(BaseModel):
    """Schema for JWT refresh token request."""

    refresh_token: str = Field(..., description="Valid refresh token")


class LogoutRequest(BaseModel):
    """Schema for logout request."""

    refresh_token: Optional[str] = Field(None, description="Optional refresh token to revoke")


class RoleBasic(BaseModel):
    """Basic role schema embedded in user info."""

    id: UUID
    name: str
    description: Optional[str] = None
    allowed_segments: List[str] = []

    model_config = ConfigDict(from_attributes=True)


class UserMeResponse(BaseModel):
    """Schema for current user profile."""

    id: UUID
    username: str
    email: str
    full_name: str
    role_id: UUID
    role: Optional[RoleBasic] = None
    department: str
    is_admin: bool
    is_active: bool
    wireguard_client_id: Optional[UUID] = None
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """Schema returned upon successful authentication."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: str
    user: UserMeResponse


class TokenData(BaseModel):
    """Internal schema extracted from JWT payload."""

    user_id: Optional[str] = None
    username: Optional[str] = None
    role: Optional[str] = None
    is_admin: bool = False
