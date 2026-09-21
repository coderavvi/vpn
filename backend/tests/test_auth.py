"""
Authentication System Tests.
Tests login success, login failure (wrong password), token refresh, and logout workflows.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from .conftest import TEST_ADMIN_USER, TEST_ADMIN_PASSWORD

client = TestClient(app)


def test_login_success():
    """Test login with valid default admin credentials."""
    response = client.post(
        "/api/auth/login",
        json={"username": TEST_ADMIN_USER, "password": TEST_ADMIN_PASSWORD},
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@vpn.local"
    assert data["user"]["is_admin"] is True


def test_login_wrong_password():
    """Test login failure with invalid password."""
    response = client.post(
        "/api/auth/login",
        json={"username": "admin@vpn.local", "password": "WrongPassword999!"},
    )
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data


def test_token_refresh():
    """Test obtaining new tokens using a valid refresh token."""
    login_resp = client.post(
        "/api/auth/login",
        json={"username": TEST_ADMIN_USER, "password": TEST_ADMIN_PASSWORD},
    )
    assert login_resp.status_code == 200
    refresh_token = login_resp.json()["refresh_token"]

    refresh_resp = client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 200, f"Refresh failed: {refresh_resp.text}"
    new_data = refresh_resp.json()
    assert "access_token" in new_data
    assert "refresh_token" in new_data
    assert new_data["refresh_token"] != refresh_token


def test_logout():
    """Test logout invalidating the refresh token."""
    login_resp = client.post(
        "/api/auth/login",
        json={"username": TEST_ADMIN_USER, "password": TEST_ADMIN_PASSWORD},
    )
    assert login_resp.status_code == 200
    access_token = login_resp.json()["access_token"]
    refresh_token = login_resp.json()["refresh_token"]

    logout_resp = client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"refresh_token": refresh_token},
    )
    assert logout_resp.status_code == 200
    assert logout_resp.json()["message"] == "Successfully logged out"

    # Attempt to refresh with revoked token should fail
    attempt_refresh = client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert attempt_refresh.status_code == 401
