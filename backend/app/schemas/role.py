"""
Role Pydantic Schemas.
Request and response models for role and permission management.
"""

from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class RoleBase(BaseModel):
    """Base schema for role definition."""

    name: str = Field(..., max_length=50, description="Unique role identifier")
    description: Optional[str] = Field(None, description="Detailed explanation of role responsibilities")
    allowed_segments: List[str] = Field(default_factory=list, description="Network namespaces allowed for this role")


class RoleCreate(RoleBase):
    """Schema for creating a new role."""

    pass


class RoleUpdate(BaseModel):
    """Schema for updating an existing role."""

    name: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    allowed_segments: Optional[List[str]] = None


class RoleResponse(RoleBase):
    """Schema for returning role details."""

    id: UUID
    created_at: Optional[datetime] = None
    user_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
