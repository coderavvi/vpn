"""
WireGuard VPN Integration Tests.
Verifies keypair generation, IP allocation, configuration formatting, and peer management.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.wireguard_service import generate_keypair

client = TestClient(app)


def get_admin_token() -> str:
    """Helper to authenticate as admin and obtain Bearer token."""
    resp = client.post(
        "/api/auth/login",
        json={"username": "admin@vpn.local", "password": "Admin@123!"},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_generate_keypair():
    """Verify cryptographic keypair generation returns valid base64 keys."""
    priv, pub = generate_keypair()
    assert len(priv) == 44, f"Invalid private key length: {priv}"
    assert len(pub) == 44, f"Invalid public key length: {pub}"
    assert priv.endswith("="), "Private key should be base64 padded"
    assert pub.endswith("="), "Public key should be base64 padded"


def test_get_wireguard_config_format():
    """
    Test that creating a user and calling GET /api/wireguard/config/{user_id}
    returns a valid WireGuard .conf file format with correct role-based AllowedIPs.
    """
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Fetch HR role
    roles_resp = client.get("/api/roles", headers=headers)
    hr_role = next(r for r in roles_resp.json() if r["name"] == "HR")

    # Create HR user
    user_payload = {
        "username": "wg_test_hr",
        "email": "wg_hr@vpn.local",
        "password": "Password123!",
        "full_name": "WG HR User",
        "department": "HR",
        "role_id": hr_role["id"],
    }
    create_resp = client.post("/api/users", headers=headers, json=user_payload)
    if create_resp.status_code == 400:
        # Cleanup if already exists
        list_resp = client.get("/api/users?search=wg_test_hr", headers=headers)
        for u in list_resp.json()["items"]:
            if u["username"] == "wg_test_hr":
                client.delete(f"/api/users/{u['id']}", headers=headers)
        create_resp = client.post("/api/users", headers=headers, json=user_payload)

    assert create_resp.status_code == 201
    user_id = create_resp.json()["id"]

    # Retrieve WireGuard config
    config_resp = client.get(f"/api/wireguard/config/{user_id}", headers=headers)
    assert config_resp.status_code == 200, f"Config fetch failed: {config_resp.text}"

    conf_data = config_resp.json()
    assert conf_data["username"] == "wg_test_hr"
    assert conf_data["filename"] == "wg0-wg_test_hr.conf"

    content = conf_data["content"]
    # Check .conf syntax and structure
    assert "[Interface]" in content
    assert "PrivateKey =" in content
    assert "Address = 10.10.0." in content
    assert "/32" in content
    assert "DNS = 1.1.1.1" in content
    assert "[Peer]" in content
    assert "PublicKey =" in content
    assert "Endpoint =" in content
    assert "AllowedIPs = 10.10.0.0/24, 10.20.10.0/24" in content
    assert "PersistentKeepalive = 25" in content


def test_user_can_download_own_config_and_not_others():
    """Verify non-admin users can access only their own configuration."""
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Retrieve user ID for wg_test_hr
    users_resp = client.get("/api/users?search=wg_test_hr", headers=headers)
    target_user = next(u for u in users_resp.json()["items"] if u["username"] == "wg_test_hr")
    user_id = target_user["id"]

    # Login as wg_test_hr
    user_login = client.post(
        "/api/auth/login",
        json={"username": "wg_test_hr", "password": "Password123!"},
    )
    assert user_login.status_code == 200
    user_token = user_login.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # Access own config -> should succeed
    own_resp = client.get(f"/api/wireguard/config/{user_id}", headers=user_headers)
    assert own_resp.status_code == 200

    # Access admin config -> should be forbidden (403)
    admin_me = client.get("/api/auth/me", headers=headers).json()
    forbidden_resp = client.get(f"/api/wireguard/config/{admin_me['id']}", headers=user_headers)
    assert forbidden_resp.status_code == 403


def test_wireguard_status():
    """Verify admin can retrieve WireGuard server status and peer telemetry."""
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    status_resp = client.get("/api/wireguard/status", headers=headers)
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert data["interface"] == "wg0"
    assert data["server_ip"] == "10.10.0.1"
    assert data["port"] == 51820
    assert "public_key" in data
    assert isinstance(data["peers"], list)
