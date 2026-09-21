"""
User and Role Management Tests.
Verifies administrative CRUD operations, role assignments, and RBAC guard enforcement.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from .conftest import TEST_ADMIN_USER, TEST_ADMIN_PASSWORD, TEST_USER_PASSWORD

client = TestClient(app)


def get_admin_token() -> str:
    """Helper to authenticate as admin and obtain Bearer token."""
    resp = client.post(
        "/api/auth/login",
        json={"username": TEST_ADMIN_USER, "password": TEST_ADMIN_PASSWORD},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_create_user():
    """Test administrator successfully creating a new user account."""
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Fetch HR role
    roles_resp = client.get("/api/roles", headers=headers)
    assert roles_resp.status_code == 200
    hr_role = next(r for r in roles_resp.json() if r["name"] == "HR")

    # Create new HR user
    user_payload = {
        "username": "hr_test_user",
        "email": "hr_test@vpn.local",
        "password": TEST_USER_PASSWORD,
        "full_name": "HR Test User",
        "department": "HR",
        "role_id": hr_role["id"],
        "is_admin": False,
    }

    create_resp = client.post("/api/users", headers=headers, json=user_payload)
    # If user already exists from previous test run, status might be 400; handle cleanup
    if create_resp.status_code == 400:
        # User might exist, let's list and delete
        users_resp = client.get("/api/users?search=hr_test_user", headers=headers)
        for u in users_resp.json()["items"]:
            if u["username"] == "hr_test_user":
                client.delete(f"/api/users/{u['id']}", headers=headers)
        create_resp = client.post("/api/users", headers=headers, json=user_payload)

    assert create_resp.status_code == 201, f"Failed to create user: {create_resp.text}"
    user_data = create_resp.json()
    assert user_data["username"] == "hr_test_user"
    assert user_data["email"] == "hr_test@vpn.local"
    assert user_data["role"]["name"] == "HR"
    assert user_data["wireguard_client_id"] is not None


def test_assign_role():
    """Test administrator updating a user's role assignment."""
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Fetch users and roles
    users_resp = client.get("/api/users?search=hr_test_user", headers=headers)
    assert users_resp.status_code == 200
    test_user = next(u for u in users_resp.json()["items"] if u["username"] == "hr_test_user")

    roles_resp = client.get("/api/roles", headers=headers)
    finance_role = next(r for r in roles_resp.json() if r["name"] == "Finance")

    # Update role to Finance
    update_resp = client.put(
        f"/api/users/{test_user['id']}",
        headers=headers,
        json={"role_id": finance_role["id"], "department": "Finance"},
    )
    assert update_resp.status_code == 200
    updated_user = update_resp.json()
    assert updated_user["role"]["name"] == "Finance"
    assert updated_user["department"] == "Finance"


def test_non_admin_cannot_create_user():
    """Test that a non-admin authenticated user receives 403 Forbidden on admin endpoints."""
    # Login as regular user
    user_login = client.post(
        "/api/auth/login",
        json={"username": "hr_test_user", "password": TEST_USER_PASSWORD},
    )
    assert user_login.status_code == 200
    user_token = user_login.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # Attempt to create another user
    roles_resp = client.get("/api/roles", headers=user_headers)
    hr_role = next(r for r in roles_resp.json() if r["name"] == "HR")

    forbidden_resp = client.post(
        "/api/users",
        headers=user_headers,
        json={
            "username": "unauthorized_user",
            "email": "unauth@vpn.local",
            "password": TEST_USER_PASSWORD,
            "full_name": "Unauthorized",
            "department": "HR",
            "role_id": hr_role["id"],
        },
    )
    assert forbidden_resp.status_code == 403, f"Expected 403, got {forbidden_resp.status_code}"
    assert "Administrator access required" in forbidden_resp.json()["detail"]
