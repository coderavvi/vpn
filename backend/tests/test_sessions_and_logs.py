"""
Sessions, Logs, and Threat Intelligence Integration Tests.
Verifies sessions querying, disconnect actions, audit trails, and summary metrics.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_admin_token() -> str:
    """Helper to authenticate as admin and obtain Bearer token."""
    resp = client.post(
        "/api/auth/login",
        json={"username": "admin@vpn.local", "password": "Admin@123!"},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_get_sessions():
    """Verify administrator can retrieve VPN sessions list and active sessions."""
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    resp = client.get("/api/sessions", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "items" in data

    active_resp = client.get("/api/sessions/active", headers=headers)
    assert active_resp.status_code == 200
    assert isinstance(active_resp.json(), list)


def test_get_audit_and_violation_logs():
    """Verify administrator can query audit logs, violations, and summary metrics."""
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Audit logs
    audit_resp = client.get("/api/logs/audit", headers=headers)
    assert audit_resp.status_code == 200
    assert isinstance(audit_resp.json(), list)
    assert len(audit_resp.json()) > 0  # Should contain login events

    # Access violations
    violation_resp = client.get("/api/logs/violations", headers=headers)
    assert violation_resp.status_code == 200
    assert isinstance(violation_resp.json(), list)

    # Threat summary
    summary_resp = client.get("/api/logs/summary", headers=headers)
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert "total_violations" in summary
    assert "total_audit_events" in summary
    assert "violations_by_type" in summary
