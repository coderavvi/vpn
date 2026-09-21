"""
Micro-Segmentation Department Portals Tests.
Verifies role authorization for HR, Finance, and IT portals, and verifies
that unauthorized cross-department attempts generate AccessViolation records.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import AccessViolation
from app.database import SessionLocal
from .conftest import TEST_ADMIN_USER, TEST_ADMIN_PASSWORD, TEST_USER_PASSWORD

client = TestClient(app)


def get_token(username: str, password: str) -> str:
    """Helper to authenticate and obtain Bearer token."""
    resp = client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
    )
    assert resp.status_code == 200, f"Login failed for {username}: {resp.text}"
    return resp.json()["access_token"]


def test_admin_can_access_all_portals():
    """Verify administrator has access to HR, Finance, and IT portals."""
    admin_token = get_token(TEST_ADMIN_USER, TEST_ADMIN_PASSWORD)
    headers = {"Authorization": f"Bearer {admin_token}", "X-Forwarded-For": "10.10.0.1"}

    hr_resp = client.get("/api/portals/hr", headers=headers)
    assert hr_resp.status_code == 200
    assert hr_resp.json()["department"] == "Human Resources"

    fin_resp = client.get("/api/portals/finance", headers=headers)
    assert fin_resp.status_code == 200
    assert fin_resp.json()["department"] == "Finance"

    it_resp = client.get("/api/portals/it", headers=headers)
    assert it_resp.status_code == 200
    assert it_resp.json()["department"] == "IT Operations"


def test_hr_user_portal_access_and_violation_logging():
    """
    Verify HR user can access HR portal, is blocked from Finance portal,
    and the unauthorized attempt logs an AccessViolation in the database.
    """
    admin_token = get_token(TEST_ADMIN_USER, TEST_ADMIN_PASSWORD)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Fetch HR role
    roles_resp = client.get("/api/roles", headers=admin_headers)
    hr_role = next(r for r in roles_resp.json() if r["name"] == "HR")

    # Ensure dedicated HR test user exists
    user_payload = {
        "username": "portal_hr_user",
        "email": "portal_hr@vpn.local",
        "password": TEST_USER_PASSWORD,
        "full_name": "Portal HR User",
        "department": "HR",
        "role_id": hr_role["id"],
    }
    create_resp = client.post("/api/users", headers=admin_headers, json=user_payload)
    if create_resp.status_code == 400:
        pass  # already exists

    hr_token = get_token("portal_hr_user", TEST_USER_PASSWORD)
    hr_headers = {"Authorization": f"Bearer {hr_token}", "X-Forwarded-For": "10.10.0.1"}

    # 1. Access HR Portal -> Should SUCCEED (200)
    hr_access = client.get("/api/portals/hr", headers=hr_headers)
    assert hr_access.status_code == 200
    assert hr_access.json()["status"] == "authorized"

    # Count violations before blocked attempt
    db = SessionLocal()
    initial_violations = db.query(AccessViolation).count()
    db.close()

    # 2. Access Finance Portal -> Should FAIL (403 Forbidden)
    fin_access = client.get("/api/portals/finance", headers=hr_headers)
    assert fin_access.status_code == 403
    assert "Access Denied" in fin_access.json()["detail"]

    # 3. Verify violation recorded in DB
    db = SessionLocal()
    new_violations = db.query(AccessViolation).count()
    latest_violation = db.query(AccessViolation).order_by(AccessViolation.created_at.desc()).first()
    db.close()

    assert new_violations > initial_violations
    assert "FINANCE" in latest_violation.violation_type
    assert latest_violation.destination_port == 9002
    assert latest_violation.action_taken == "BLOCKED"
