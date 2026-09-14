"""
Authentication Router.
Exposes endpoints for user login, token refresh, logout, and self-profile inspection.
"""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    LogoutRequest,
    TokenResponse,
    UserMeResponse,
    RoleBasic,
)
from app.services.auth_service import (
    authenticate_user,
    create_user_tokens,
    rotate_refresh_token,
    revoke_token,
)
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _build_user_me_response(user: User) -> UserMeResponse:
    """Helper to convert User model with role to UserMeResponse."""
    role_basic = None
    if user.role:
        role_basic = RoleBasic(
            id=user.role.id,
            name=user.role.name,
            description=user.role.description,
            allowed_segments=user.role.allowed_segments or [],
        )

    return UserMeResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role_id=user.role_id,
        role=role_basic,
        department=user.department,
        is_admin=user.is_admin,
        is_active=user.is_active,
        wireguard_client_id=user.wireguard_client_id,
        last_login=user.last_login,
    )


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Authenticate user credentials and return access and refresh tokens.
    Locked out after 5 consecutive failed attempts.
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    user = authenticate_user(
        db=db,
        username_or_email=payload.username,
        password=payload.password,
        ip_address=client_ip,
        user_agent=user_agent,
    )

    access_token, refresh_token, expires_in = create_user_tokens(
        db=db,
        user=user,
        ip_address=client_ip,
        device_info=user_agent,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        refresh_token=refresh_token,
        user=_build_user_me_response(user),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    payload: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Rotate existing refresh token to issue a new access and refresh token pair.
    Detects revoked token reuse attacks and revokes all user sessions.
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    access_token, new_refresh_token, expires_in, user = rotate_refresh_token(
        db=db,
        refresh_token_plain=payload.refresh_token,
        ip_address=client_ip,
        device_info=user_agent,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        refresh_token=new_refresh_token,
        user=_build_user_me_response(user),
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(
    payload: LogoutRequest = LogoutRequest(),
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Log out current user and invalidate refresh tokens.
    """
    client_ip = request.client.host if request and request.client else None
    revoke_token(
        db=db,
        user_id=current_user.id,
        refresh_token_plain=payload.refresh_token,
        ip_address=client_ip,
    )
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserMeResponse)
def get_me(
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve authenticated user's profile and assigned role permissions.
    """
    return _build_user_me_response(current_user)
