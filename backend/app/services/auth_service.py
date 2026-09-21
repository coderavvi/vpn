"""
Authentication Service Module.
Handles password hashing, JWT generation/validation, refresh token lifecycles,
account lockout logic, and audit trail generation.
"""

import hashlib
import ipaddress
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from uuid import UUID
from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.models import User, RefreshToken, AuditLog

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def sanitize_ip(ip_str: Optional[str]) -> Optional[str]:
    """Sanitize IP address string for PostgreSQL INET column storage."""
    if not ip_str:
        return None
    if ip_str == "testclient":
        return "127.0.0.1"
    try:
        ipaddress.ip_address(ip_str)
        return ip_str
    except ValueError:
        return None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate bcrypt hash for a plaintext password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a signed JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """Decode and validate a signed JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def generate_refresh_token_string() -> str:
    """Generate a cryptographically secure random refresh token string."""
    return secrets.token_urlsafe(64)


def hash_token(token: str) -> str:
    """Generate SHA256 hash of a token string for safe database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def log_audit_event(
    db: Session,
    event_type: str,
    description: str,
    user_id: Optional[UUID] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    metadata: Optional[dict] = None,
    severity: str = "INFO",
) -> AuditLog:
    """Create and persist an audit log entry."""
    valid_ip = sanitize_ip(ip_address)
    audit_entry = AuditLog(
        user_id=user_id,
        event_type=event_type,
        description=description,
        ip_address=valid_ip,
        user_agent=user_agent,
        event_metadata=metadata,
        severity=severity,
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry


def authenticate_user(
    db: Session,
    username_or_email: str,
    password: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> User:
    """
    Authenticate user by username or email.
    Enforces account lockout after 5 consecutive failed attempts.
    """
    now = datetime.now(timezone.utc)
    user = (
        db.query(User)
        .filter((User.username == username_or_email) | (User.email == username_or_email))
        .first()
    )

    if not user:
        log_audit_event(
            db=db,
            event_type="AUTH_FAILED",
            description=f"Failed login attempt for non-existent user identifier: {username_or_email}",
            ip_address=ip_address,
            user_agent=user_agent,
            severity="WARNING",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    # Check account lock status
    if user.locked_until and user.locked_until > now:
        remaining_seconds = int((user.locked_until - now).total_seconds())
        if remaining_seconds >= 60:
            remaining_str = f"{int(remaining_seconds / 60) + 1} minutes"
        else:
            remaining_str = f"{max(1, remaining_seconds)} seconds"
        log_audit_event(
            db=db,
            event_type="AUTH_LOCKED",
            description=f"Attempted login on locked account: {user.username}",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            severity="WARNING",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is locked due to multiple failed login attempts. Try again in {remaining_str}.",
        )

    # Check if user account is deactivated
    if not user.is_active:
        log_audit_event(
            db=db,
            event_type="AUTH_DEACTIVATED",
            description=f"Attempted login on deactivated account: {user.username}",
            user_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            severity="WARNING",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Please contact an administrator.",
        )

    # Verify password
    if not verify_password(password, user.hashed_password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        max_attempts = getattr(settings, "MAX_FAILED_LOGIN_ATTEMPTS", 5)
        lockout_mins = getattr(settings, "ACCOUNT_LOCKOUT_MINUTES", 1)
        if user.failed_login_attempts >= max_attempts:
            user.locked_until = now + timedelta(minutes=lockout_mins)
            lock_duration_str = f"{lockout_mins} minute" if lockout_mins == 1 else f"{lockout_mins} minutes"
            log_audit_event(
                db=db,
                event_type="ACCOUNT_LOCKED",
                description=f"Account locked for {lock_duration_str} after {max_attempts} failed login attempts: {user.username}",
                user_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                severity="HIGH",
            )
        else:
            log_audit_event(
                db=db,
                event_type="AUTH_FAILED",
                description=f"Failed login attempt ({user.failed_login_attempts}/{max_attempts}) for user: {user.username}",
                user_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                severity="WARNING",
            )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    # Reset failure counter and update last login
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = now
    db.commit()

    log_audit_event(
        db=db,
        event_type="AUTH_SUCCESS",
        description=f"User {user.username} successfully logged in",
        user_id=user.id,
        ip_address=ip_address,
        user_agent=user_agent,
        severity="INFO",
    )
    return user


def create_user_tokens(
    db: Session,
    user: User,
    ip_address: Optional[str] = None,
    device_info: Optional[str] = None,
) -> Tuple[str, str, int]:
    """
    Generate access token and persistent refresh token for a user.
    Returns: (access_token, refresh_token_string, expires_in_seconds)
    """
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_payload = {
        "sub": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role.name if user.role else "None",
        "role_id": str(user.role_id),
        "is_admin": user.is_admin,
    }
    access_token = create_access_token(data=token_payload, expires_delta=access_token_expires)

    # Create persistent refresh token
    refresh_token_plain = generate_refresh_token_string()
    token_hash = hash_token(refresh_token_plain)
    refresh_expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    valid_ip = sanitize_ip(ip_address)
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=refresh_expires_at,
        is_revoked=False,
        device_info=device_info,
        ip_address=valid_ip,
    )
    db.add(db_refresh_token)
    db.commit()

    return access_token, refresh_token_plain, settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def rotate_refresh_token(
    db: Session,
    refresh_token_plain: str,
    ip_address: Optional[str] = None,
    device_info: Optional[str] = None,
) -> Tuple[str, str, int, User]:
    """
    Validate existing refresh token, revoke it, and issue a new access token & refresh token pair.
    """
    now = datetime.now(timezone.utc)
    token_hash = hash_token(refresh_token_plain)

    db_token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_hash)
        .first()
    )

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if db_token.is_revoked:
        # Potential reuse attack detected! Revoke all tokens for this user
        db.query(RefreshToken).filter(RefreshToken.user_id == db_token.user_id).update(
            {"is_revoked": True, "revoked_at": now}
        )
        db.commit()
        log_audit_event(
            db=db,
            event_type="TOKEN_REUSE_DETECTED",
            description="Attempted use of already revoked refresh token; invalidated all user sessions",
            user_id=db_token.user_id,
            ip_address=ip_address,
            severity="CRITICAL",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Revoked token reuse detected. Please log in again.",
        )

    if db_token.expires_at < now:
        db_token.is_revoked = True
        db_token.revoked_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
        )

    user = db.query(User).filter(User.id == db_token.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Revoke current refresh token
    db_token.is_revoked = True
    db_token.revoked_at = now

    # Generate new pair
    access_token, new_refresh_token, expires_in = create_user_tokens(
        db=db,
        user=user,
        ip_address=ip_address,
        device_info=device_info,
    )

    log_audit_event(
        db=db,
        event_type="TOKEN_REFRESH",
        description=f"Refreshed session tokens for user: {user.username}",
        user_id=user.id,
        ip_address=ip_address,
        severity="INFO",
    )

    return access_token, new_refresh_token, expires_in, user


def revoke_token(
    db: Session,
    user_id: UUID,
    refresh_token_plain: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> None:
    """Revoke user refresh tokens on logout."""
    now = datetime.now(timezone.utc)
    if refresh_token_plain:
        token_hash = hash_token(refresh_token_plain)
        db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == user_id,
        ).update({"is_revoked": True, "revoked_at": now})
    else:
        # Revoke all tokens for the user
        db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked.is_(False),
        ).update({"is_revoked": True, "revoked_at": now})

    db.commit()
    log_audit_event(
        db=db,
        event_type="AUTH_LOGOUT",
        description="User logged out and session revoked",
        user_id=user_id,
        ip_address=ip_address,
        severity="INFO",
    )
