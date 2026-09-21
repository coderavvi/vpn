#!/usr/bin/env python3
"""
Database Seed Script.
Populates default enterprise roles (Admin, HR, Finance, IT),
default administrator user, and standard test accounts.
"""

import sys
import os

# Add backend directory to path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend"))
sys.path.insert(0, backend_dir)

from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(backend_dir, ".env"))
load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "../.env")))

from passlib.context import CryptContext
from app.database import SessionLocal
from app.models import Role, User
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """Hash password using bcrypt."""
    return pwd_context.hash(password)


def seed_database():
    """Seed roles, default admin user, and standard test accounts into PostgreSQL."""
    db = SessionLocal()
    try:
        print("Seeding roles...")
        roles_data = [
            {
                "name": "Admin",
                "description": "System Administrator with full access to all network segments",
                "allowed_segments": ["hr-ns", "finance-ns", "it-ns"],
            },
            {
                "name": "HR",
                "description": "Human Resources staff with access to hr-ns segment",
                "allowed_segments": ["hr-ns"],
            },
            {
                "name": "Finance",
                "description": "Finance staff with access to finance-ns segment",
                "allowed_segments": ["finance-ns"],
            },
            {
                "name": "IT",
                "description": "IT department staff with access to it-ns segment",
                "allowed_segments": ["it-ns"],
            },
        ]

        roles_by_name = {}
        for r_info in roles_data:
            role = db.query(Role).filter(Role.name == r_info["name"]).first()
            if not role:
                role = Role(
                    name=r_info["name"],
                    description=r_info["description"],
                    allowed_segments=r_info["allowed_segments"],
                )
                db.add(role)
                db.flush()
                print(f"  Created role: {role.name}")
            else:
                role.description = r_info["description"]
                role.allowed_segments = r_info["allowed_segments"]
                db.flush()
                print(f"  Role already exists: {role.name}")
            roles_by_name[role.name] = role

        print("\nSeeding default admin user...")
        admin_email = os.getenv("INITIAL_ADMIN_EMAIL") or getattr(settings, "INITIAL_ADMIN_EMAIL", "admin@vpn.local")
        admin_username = os.getenv("INITIAL_ADMIN_USERNAME") or getattr(settings, "INITIAL_ADMIN_USERNAME", "admin")
        admin_password = os.getenv("INITIAL_ADMIN_PASSWORD") or getattr(settings, "INITIAL_ADMIN_PASSWORD", "NexusAuth#2024!v9X")

        admin_user = (
            db.query(User)
            .filter((User.email == admin_email) | (User.username == admin_username))
            .first()
        )

        if not admin_user:
            admin_user = User(
                username=admin_username,
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                full_name="System Administrator",
                role_id=roles_by_name["Admin"].id,
                department="IT",
                is_active=True,
                is_admin=True,
                failed_login_attempts=0,
                locked_until=None,
            )
            db.add(admin_user)
            db.commit()
            print(f"  Created admin user: {admin_user.email} / {admin_user.username}")
        else:
            admin_user.username = admin_username
            admin_user.email = admin_email
            admin_user.hashed_password = get_password_hash(admin_password)
            admin_user.role_id = roles_by_name["Admin"].id
            admin_user.is_active = True
            admin_user.is_admin = True
            admin_user.failed_login_attempts = 0
            admin_user.locked_until = None
            db.commit()
            print(f"  Updated admin user: {admin_user.email} / {admin_user.username}")

        print("\nSeeding standard test users...")
        user_password = os.getenv("INITIAL_USER_PASSWORD") or getattr(settings, "INITIAL_USER_PASSWORD", "NexusPortal$8821!kL")
        test_users_data = [
            {
                "username": "portal_hr_user",
                "email": "portal_hr@vpn.local",
                "full_name": "Portal HR Specialist",
                "department": "HR",
                "role_name": "HR",
            },
            {
                "username": "fin_user",
                "email": "fin_user@vpn.local",
                "full_name": "Finance Analyst",
                "department": "Finance",
                "role_name": "Finance",
            },
            {
                "username": "it_user",
                "email": "it_user@vpn.local",
                "full_name": "IT Engineer",
                "department": "IT",
                "role_name": "IT",
            },
        ]

        for u_info in test_users_data:
            existing_user = (
                db.query(User)
                .filter((User.username == u_info["username"]) | (User.email == u_info["email"]))
                .first()
            )
            role = roles_by_name[u_info["role_name"]]
            if not existing_user:
                new_user = User(
                    username=u_info["username"],
                    email=u_info["email"],
                    hashed_password=get_password_hash(user_password),
                    full_name=u_info["full_name"],
                    role_id=role.id,
                    department=u_info["department"],
                    is_active=True,
                    is_admin=False,
                    failed_login_attempts=0,
                    locked_until=None,
                )
                db.add(new_user)
                db.commit()
                print(f"  Created test user: {new_user.username} ({new_user.email})")
            else:
                existing_user.hashed_password = get_password_hash(user_password)
                existing_user.role_id = role.id
                existing_user.department = u_info["department"]
                existing_user.full_name = u_info["full_name"]
                existing_user.is_active = True
                existing_user.failed_login_attempts = 0
                existing_user.locked_until = None
                db.commit()
                print(f"  Updated test user: {existing_user.username} ({existing_user.email})")

        print("\nDatabase seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
