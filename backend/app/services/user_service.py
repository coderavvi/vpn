"""
User Management Service Module.
Handles CRUD lifecycle of user accounts, role associations, and WireGuard key provisioning.
"""

from typing import List, Optional, Tuple
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models import User, Role, WireGuardClient
from app.schemas.user import UserCreate, UserUpdate
from app.services.auth_service import get_password_hash, log_audit_event
from app.services.wireguard_service import (
    remove_peer_from_server,
    generate_keypair,
    encrypt_key,
    register_peer,
)


def _generate_placeholder_wireguard_keys(db: Session, user: User) -> WireGuardClient:
    """
    Placeholder/initial WireGuard key provisioning for newly created user accounts.
    Generates cryptographic keypair placeholder and allocates next available IP in 10.10.0.0/24.
    """
    # Count existing WireGuard clients to assign next available IP (starting at 10.10.0.2)
    existing_clients = db.query(WireGuardClient).all()
    used_ips = {str(c.assigned_ip) for c in existing_clients}

    # Find first free IP from 10.10.0.2 through 10.10.0.254
    assigned_ip = None
    for i in range(2, 255):
        candidate = f"10.10.0.{i}"
        if candidate not in used_ips:
            assigned_ip = candidate
            break

    if not assigned_ip:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="VPN subnet IP pool exhausted (10.10.0.2 - 10.10.0.254)",
        )

    # Generate cryptographic WireGuard keypair and encrypt private key
    priv, pub = generate_keypair()

    wg_client = WireGuardClient(
        user_id=user.id,
        public_key=pub,
        private_key_encrypted=encrypt_key(priv),
        assigned_ip=assigned_ip,
        is_active=True,
    )
    db.add(wg_client)
    db.flush()

    user.wireguard_client_id = wg_client.id
    db.flush()

    # Attempt interface peer registration
    register_peer(wg_client, db)
    return wg_client


def get_users(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    role_id: Optional[UUID] = None,
    department: Optional[str] = None,
) -> Tuple[List[User], int]:
    """Retrieve users with pagination and optional search/filter criteria."""
    query = db.query(User)

    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                User.username.ilike(search_fmt),
                User.email.ilike(search_fmt),
                User.full_name.ilike(search_fmt),
            )
        )

    if role_id:
        query = query.filter(User.role_id == role_id)

    if department:
        query = query.filter(User.department.ilike(department))

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return users, total


def get_user_by_id(db: Session, user_id: UUID) -> Optional[User]:
    """Fetch single user by ID."""
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, user_in: UserCreate, admin_user: Optional[User] = None) -> User:
    """
    Create a new user account with role assignment and auto-generated WireGuard keypair.
    """
    # Check for existing username or email
    existing_user = (
        db.query(User)
        .filter((User.username == user_in.username) | (User.email == user_in.email))
        .first()
    )
    if existing_user:
        if existing_user.username == user_in.username:
            raise HTTPException(status_code=400, detail="Username already registered")
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate role exists
    role = db.query(Role).filter(Role.id == user_in.role_id).first()
    if not role:
        raise HTTPException(status_code=400, detail="Specified role does not exist")

    # Hash password and create User
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_pwd,
        full_name=user_in.full_name,
        department=user_in.department,
        role_id=user_in.role_id,
        is_admin=user_in.is_admin,
        is_active=True,
    )
    db.add(user)
    db.flush()

    # Automatically provision WireGuard keypair
    _generate_placeholder_wireguard_keys(db, user)

    db.commit()
    db.refresh(user)

    admin_username = admin_user.username if admin_user else "System"
    admin_id = admin_user.id if admin_user else None
    log_audit_event(
        db=db,
        event_type="USER_CREATED",
        description=f"{admin_username} created user account: {user.username} ({user.email})",
        user_id=admin_id,
        severity="INFO",
    )

    return user


def update_user(db: Session, user_id: UUID, user_in: UserUpdate, admin_user: User) -> User:
    """Update user information, credentials, or role assignment."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_in.email and user_in.email != user.email:
        conflict = db.query(User).filter(User.email == user_in.email).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = user_in.email

    if user_in.full_name:
        user.full_name = user_in.full_name

    if user_in.department:
        user.department = user_in.department

    if user_in.role_id:
        role = db.query(Role).filter(Role.id == user_in.role_id).first()
        if not role:
            raise HTTPException(status_code=400, detail="Specified role does not exist")
        user.role_id = user_in.role_id

    if user_in.password:
        user.hashed_password = get_password_hash(user_in.password)

    if user_in.is_admin is not None:
        user.is_admin = user_in.is_admin

    if user_in.is_active is not None:
        user.is_active = user_in.is_active
        if not user_in.is_active and user.wireguard_client and user.wireguard_client.public_key:
            remove_peer_from_server(user.wireguard_client.public_key)
            user.wireguard_client.is_active = False

    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        event_type="USER_UPDATED",
        description=f"Admin {admin_user.username} updated user: {user.username}",
        user_id=admin_user.id,
        severity="INFO",
    )
    return user


def delete_user(db: Session, user_id: UUID, admin_user: User) -> dict:
    """Permanently delete a user account and cascade delete associated WireGuard config."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")

    username = user.username
    if user.wireguard_client and user.wireguard_client.public_key:
        remove_peer_from_server(user.wireguard_client.public_key)

    db.delete(user)
    db.commit()

    log_audit_event(
        db=db,
        event_type="USER_DELETED",
        description=f"Admin {admin_user.username} deleted user: {username}",
        user_id=admin_user.id,
        severity="WARNING",
    )
    return {"message": f"User {username} successfully deleted"}


def activate_user(db: Session, user_id: UUID, admin_user: User) -> User:
    """Activate a deactivated user account."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True
    user.locked_until = None
    user.failed_login_attempts = 0
    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        event_type="USER_ACTIVATED",
        description=f"Admin {admin_user.username} activated user: {user.username}",
        user_id=admin_user.id,
        severity="INFO",
    )
    return user


def deactivate_user(db: Session, user_id: UUID, admin_user: User) -> User:
    """Deactivate a user account and disable VPN access."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own admin account")

    if user.wireguard_client and user.wireguard_client.public_key:
        remove_peer_from_server(user.wireguard_client.public_key)
        user.wireguard_client.is_active = False

    user.is_active = False
    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        event_type="USER_DEACTIVATED",
        description=f"Admin {admin_user.username} deactivated user: {user.username}",
        user_id=admin_user.id,
        severity="WARNING",
    )
    return user
