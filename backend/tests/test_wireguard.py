import io
import subprocess
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.wireguard_service import generate_keypair
from .conftest import TEST_ADMIN_USER, TEST_ADMIN_PASSWORD, TEST_USER_PASSWORD

client = TestClient(app)
_orig_open = open
_orig_run = subprocess.run


def _mock_open(file, *args, **kwargs):
    if str(file) == "/etc/wireguard/server_public.key":
        return io.StringIO("rZBROI3CgU7/vXv36oI+Eft44xya7/E4Yr/JzkcjYWw=\n")
    return _orig_open(file, *args, **kwargs)


def _mock_run(cmd, *args, **kwargs):
    if isinstance(cmd, list) and any(sub in cmd for sub in ("set", "save", "remove")):
        return subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")
    return _orig_run(cmd, *args, **kwargs)


def get_admin_token() -> str:
    """Helper to authenticate as admin and obtain Bearer token."""
    resp = client.post(
        "/api/auth/login",
        json={"username": TEST_ADMIN_USER, "password": TEST_ADMIN_PASSWORD},
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
        "password": TEST_USER_PASSWORD,
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

    # Retrieve WireGuard config (with mock for filesystem server public key and sudo wg set)
    with patch("builtins.open", side_effect=_mock_open), \
         patch("subprocess.run", side_effect=_mock_run):
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
    assert "PublicKey = rZBROI3CgU7/vXv36oI+Eft44xya7/E4Yr/JzkcjYWw=" in content
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
        json={"username": "wg_test_hr", "password": TEST_USER_PASSWORD},
    )
    assert user_login.status_code == 200
    user_token = user_login.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # Access own config -> should succeed
    with patch("builtins.open", side_effect=_mock_open), \
         patch("subprocess.run", side_effect=_mock_run):
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


def test_wireguard_server_pubkey_from_settings(monkeypatch):
    """Verify that settings.WIREGUARD_SERVER_PUBKEY (from .env) dictates the PublicKey in generated configs."""
    from app.config import settings
    from app.services.wireguard_service import get_server_public_key, generate_config
    from app.database import SessionLocal
    from app.models import User

    test_custom_pubkey = "TestCustomPubKey12345678901234567890123456="
    monkeypatch.setattr(settings, "WIREGUARD_SERVER_PUBKEY", test_custom_pubkey)

    # get_server_public_key must return the env/settings key directly
    assert get_server_public_key() == test_custom_pubkey

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin").first()
        assert user is not None
        with patch("subprocess.run", side_effect=_mock_run):
            cfg = generate_config(user.id, db)
        assert f"PublicKey = {test_custom_pubkey}" in cfg.content
    finally:
        db.close()


def test_wireguard_server_pubkey_fallback_to_live_interface(monkeypatch):
    """Verify that when .env pubkey is not configured, it queries the live WireGuard interface."""
    from app.config import settings
    from app.services.wireguard_service import get_server_public_key

    monkeypatch.setattr(settings, "WIREGUARD_SERVER_PUBKEY", "")
    monkeypatch.setattr(settings, "WIREGUARD_SERVER_PUBLIC_KEY", "")

    mock_live_pubkey = "LiveInterfacePubKey123456789012345678901234="

    def mock_wg_run(cmd, *args, **kwargs):
        if "show" in cmd and "public-key" in cmd:
            return subprocess.CompletedProcess(cmd, 0, stdout=mock_live_pubkey + "\n", stderr="")
        return _mock_run(cmd, *args, **kwargs)

    with patch("subprocess.run", side_effect=mock_wg_run):
        assert get_server_public_key() == mock_live_pubkey

