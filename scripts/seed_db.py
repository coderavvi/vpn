#!/usr/bin/env python3
"""
Database Seed Script.
Populates default enterprise roles (Admin, HR, Finance, IT) and default administrator user.
"""

import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from passlib.context import CryptContext
from app.database import SessionLocal
from app.models import Role, User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """Hash password using bcrypt."""
    return pwd_context.hash(password)


def seed_database():
    """Seed roles and default admin user into PostgreSQL."""
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
        admin_email = "admin@vpn.local"
        admin_username = "admin"
        admin_password = "Admin@123!"

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
            )
            db.add(admin_user)
            db.commit()
            print(f"  Created admin user: {admin_user.email} / {admin_user.username}")
        else:
            admin_user.hashed_password = get_password_hash(admin_password)
            admin_user.role_id = roles_by_name["Admin"].id
            admin_user.is_active = True
            admin_user.is_admin = True
            db.commit()
            print(f"  Updated admin user: {admin_user.email}")

        print("\nDatabase seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
