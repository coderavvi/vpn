"""
VPN Enforcement Integration Tests.
Tests that department portal endpoints are strictly protected by VPN IP checks,
while authentication and management endpoints remain accessible.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import AccessViolation

client = TestClient(app)


def test_portal_blocked_without_vpn():
    """
    Make a GET request to /api/portals/hr with a non-VPN client IP
    (simulate with X-Forwarded-For: 192.168.56.1)
    Assert: response status is 403
    Assert: response body contains 'VPN_REQUIRED'
    """
    response = client.get(
        "/api/portals/hr",
        headers={"X-Forwarded-For": "192.168.56.1"},
    )
    assert response.status_code == 403
    assert "VPN_REQUIRED" in response.text
    data = response.json()
    assert data.get("error") == "VPN_REQUIRED"
    assert "active VPN connection" in data.get("message", "")


def test_portal_blocked_creates_violation_log():
    """
    Make a blocked request as above
    Query the access_violations table
    Assert: a new row exists with violation_type = 'VPN_BYPASS_ATTEMPT'
    """
    db = SessionLocal()
    initial_count = db.query(AccessViolation).filter(AccessViolation.violation_type == "VPN_BYPASS_ATTEMPT").count()
    db.close()

    response = client.get(
        "/api/portals/hr",
        headers={"X-Forwarded-For": "192.168.56.1"},
    )
    assert response.status_code == 403
    assert "VPN_REQUIRED" in response.text

    db = SessionLocal()
    new_count = db.query(AccessViolation).filter(AccessViolation.violation_type == "VPN_BYPASS_ATTEMPT").count()
    latest_violation = (
        db.query(AccessViolation)
        .filter(AccessViolation.violation_type == "VPN_BYPASS_ATTEMPT")
        .order_by(AccessViolation.created_at.desc())
        .first()
    )
    db.close()

    assert new_count > initial_count
    assert latest_violation is not None
    assert latest_violation.violation_type == "VPN_BYPASS_ATTEMPT"
    assert latest_violation.action_taken == "BLOCKED"
    assert latest_violation.destination_port == 9001
    assert latest_violation.nftables_rule_matched == "API_MIDDLEWARE_VPN_CHECK"


def test_portal_allowed_with_vpn_ip():
    """
    Make a GET request to /api/portals/hr with a VPN client IP
    (simulate with X-Forwarded-For: 10.10.0.5)
    Assert: response status is 200 or 403 (RBAC may still block if wrong role — but NOT a VPN block)
    """
    response = client.get(
        "/api/portals/hr",
        headers={"X-Forwarded-For": "10.10.0.5"},
    )
    # RBAC or unauthenticated can return 401 or 403, but it must NOT be a VPN block
    assert "VPN_REQUIRED" not in response.text


def test_auth_endpoints_not_affected():
    """
    Make a GET request to /api/auth/me with a non-VPN IP
    Assert: response status is 401 (auth failure) NOT 403 (VPN block)
    This confirms auth endpoints are never VPN-gated.
    """
    response = client.get(
        "/api/auth/me",
        headers={"X-Forwarded-For": "192.168.56.1"},
    )
    assert response.status_code == 401
    assert "VPN_REQUIRED" not in response.text


def test_vpn_status_endpoint():
    """
    GET /api/auth/vpn-status with X-Forwarded-For: 10.10.0.3 -> Assert: vpn_connected = true
    GET /api/auth/vpn-status with X-Forwarded-For: 192.168.56.1 -> Assert: vpn_connected = false
    """
    resp_vpn = client.get(
        "/api/auth/vpn-status",
        headers={"X-Forwarded-For": "10.10.0.3"},
    )
    assert resp_vpn.status_code == 200
    data_vpn = resp_vpn.json()
    assert data_vpn["vpn_connected"] is True
    assert data_vpn["client_ip"] == "10.10.0.3"
    assert data_vpn["message"] == "Connected via VPN"

    resp_non_vpn = client.get(
        "/api/auth/vpn-status",
        headers={"X-Forwarded-For": "192.168.56.1"},
    )
    assert resp_non_vpn.status_code == 200
    data_non_vpn = resp_non_vpn.json()
    assert data_non_vpn["vpn_connected"] is False
    assert data_non_vpn["client_ip"] == "192.168.56.1"
    assert data_non_vpn["message"] == "Not connected to VPN"
