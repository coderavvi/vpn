"""
WireGuard VPN Service Module.
Handles cryptographic keypair generation, IP allocation, configuration file synthesis,
and WireGuard CLI interaction (wg show, wg set).
"""

import base64
import hashlib
import ipaddress
import logging
import os
import subprocess
from typing import Dict, List, Optional, Tuple
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet

from app.config import settings
from app.models import User, WireGuardClient, VPNSession
from app.schemas.wireguard import (
    WireGuardConfigResponse,
    WireGuardPeerStatus,
    WireGuardStatusResponse,
)
from app.services.auth_service import log_audit_event

logger = logging.getLogger("wireguard_service")


def get_fernet_cipher() -> Fernet:
    """Derive a 32-byte Fernet key from application SECRET_KEY for symmetric encryption."""
    key_bytes = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key_bytes))


def encrypt_key(plain_text: str) -> str:
    """Encrypt sensitive cryptographic key using authenticated Fernet cipher."""
    cipher = get_fernet_cipher()
    return cipher.encrypt(plain_text.encode("utf-8")).decode("utf-8")


def decrypt_key(cipher_text: str) -> str:
    """Decrypt encrypted cryptographic key."""
    cipher = get_fernet_cipher()
    return cipher.decrypt(cipher_text.encode("utf-8")).decode("utf-8")


def generate_keypair() -> Tuple[str, str]:
    """
    Generate WireGuard private and public keypair using wg CLI.
    Fallback to cryptography package if wg executable is unavailable.
    Returns: (private_key, public_key)
    """
    try:
        # Generate private key
        gen_proc = subprocess.run(
            ["wg", "genkey"],
            capture_output=True,
            text=True,
            check=True,
        )
        private_key = gen_proc.stdout.strip()

        # Generate public key from private key
        pub_proc = subprocess.run(
            ["wg", "pubkey"],
            input=private_key,
            capture_output=True,
            text=True,
            check=True,
        )
        public_key = pub_proc.stdout.strip()
        return private_key, public_key
    except Exception as exc:
        logger.warning("wg command failed, using Python cryptography fallback for keypair: %s", exc)
        from cryptography.hazmat.primitives.asymmetric import x25519
        from cryptography.hazmat.primitives import serialization

        priv = x25519.X25519PrivateKey.generate()
        priv_bytes = priv.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption(),
        )
        pub_bytes = priv.public_key().public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )
        private_key = base64.b64encode(priv_bytes).decode("utf-8")
        public_key = base64.b64encode(pub_bytes).decode("utf-8")
        return private_key, public_key


def assign_ip(db: Session) -> str:
    """
    Find and allocate the next available IP address in the 10.10.0.0/24 subnet.
    Allocates from 10.10.0.2 to 10.10.0.254.
    """
    existing_clients = db.query(WireGuardClient).all()
    used_ips = {str(c.assigned_ip) for c in existing_clients}

    for i in range(2, 255):
        ip = f"10.10.0.{i}"
        if ip not in used_ips:
            return ip

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="WireGuard IP address pool exhausted (10.10.0.2 - 10.10.0.254)",
    )


def get_server_public_key() -> str:
    """
    Retrieve the server WireGuard public key from settings or generated key file.
    """
    if settings.WIREGUARD_SERVER_PUBLIC_KEY:
        return settings.WIREGUARD_SERVER_PUBLIC_KEY

    key_path = os.path.join(settings.WIREGUARD_CONFIG_DIR, "server_public.key")
    if os.path.exists(key_path) and os.access(key_path, os.R_OK):
        try:
            with open(key_path, "r", encoding="utf-8") as f:
                return f.read().strip()
        except Exception:
            pass

    # Check local network/wireguard directory
    local_key = "/home/vboxuser/vpn-project/network/wireguard/server_public.key"
    if os.path.exists(local_key):
        with open(local_key, "r", encoding="utf-8") as f:
            return f.read().strip()

    # Generate and save a persistent local server keypair
    os.makedirs("/home/vboxuser/vpn-project/network/wireguard", exist_ok=True)
    priv, pub = generate_keypair()
    with open("/home/vboxuser/vpn-project/network/wireguard/server_private.key", "w", encoding="utf-8") as f:
        f.write(priv)
    with open(local_key, "w", encoding="utf-8") as f:
        f.write(pub)
    return pub


def _calculate_allowed_ips_for_role(role_name: str, allowed_segments: List[str]) -> str:
    """
    Calculate AllowedIPs directive for client WireGuard config based on user role.
    Implements Client-Side Micro-Segmentation Layer 1.
    """
    role_lower = role_name.lower() if role_name else ""
    subnets = ["10.10.0.0/24"]  # Base VPN subnet

    segment_to_subnet = {
        "hr-ns": "10.20.10.0/24",
        "finance-ns": "10.20.20.0/24",
        "it-ns": "10.20.30.0/24",
    }

    if "admin" in role_lower:
        subnets.extend(["10.20.10.0/24", "10.20.20.0/24", "10.20.30.0/24"])
    else:
        for seg in allowed_segments or []:
            if seg in segment_to_subnet and segment_to_subnet[seg] not in subnets:
                subnets.append(segment_to_subnet[seg])

    return ", ".join(subnets)


def generate_config(user_id: UUID, db: Session) -> WireGuardConfigResponse:
    """
    Generate or retrieve WireGuard .conf configuration file content for a given user.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    client = db.query(WireGuardClient).filter(WireGuardClient.user_id == user_id).first()
    if not client:
        # Provision a client if one doesn't exist
        client = provision_wireguard_client(user_id, db)

    # Decrypt client private key
    try:
        private_key = decrypt_key(client.private_key_encrypted)
    except Exception:
        # Re-generate keypair if old key was a placeholder or corrupted
        priv, pub = generate_keypair()
        client.public_key = pub
        client.private_key_encrypted = encrypt_key(priv)
        db.commit()
        private_key = priv

    server_pubkey = get_server_public_key()
    server_endpoint = f"{settings.WIREGUARD_ENDPOINT_HOST}:{settings.WIREGUARD_SERVER_PORT}"
    allowed_segments = user.role.allowed_segments if user.role else []
    role_name = user.role.name if user.role else "user"
    allowed_ips_str = _calculate_allowed_ips_for_role(role_name, allowed_segments)

    # Build WireGuard configuration format
    conf_lines = [
        "[Interface]",
        f"PrivateKey = {private_key}",
        f"Address = {client.assigned_ip}/32",
        "DNS = 1.1.1.1",
        "",
        "[Peer]",
        f"PublicKey = {server_pubkey}",
        f"Endpoint = {server_endpoint}",
        f"AllowedIPs = {allowed_ips_str}",
        "PersistentKeepalive = 25",
        "",
    ]
    content = "\n".join(conf_lines)

    # Update client config content in database
    client.config_file_content = content
    db.commit()

    filename = f"wg0-{user.username}.conf"
    return WireGuardConfigResponse(
        user_id=user.id,
        username=user.username,
        filename=filename,
        content=content,
    )


def provision_wireguard_client(user_id: UUID, db: Session) -> WireGuardClient:
    """
    Create a new WireGuard client record with fresh keys and assigned IP.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if client already exists
    existing = db.query(WireGuardClient).filter(WireGuardClient.user_id == user_id).first()
    if existing:
        return existing

    priv_key, pub_key = generate_keypair()
    assigned_ip_addr = assign_ip(db)

    client = WireGuardClient(
        user_id=user.id,
        public_key=pub_key,
        private_key_encrypted=encrypt_key(priv_key),
        assigned_ip=assigned_ip_addr,
        is_active=True,
    )
    db.add(client)
    db.flush()

    user.wireguard_client_id = client.id
    db.commit()
    db.refresh(client)

    # Register peer on interface if available
    register_peer(client, db)
    return client


def register_peer(client: WireGuardClient, db: Session) -> bool:
    """
    Register a client peer with the Linux wg0 interface using wg CLI.
    Command: wg set wg0 peer <pubkey> allowed-ips <ip>/32
    """
    cmd = [
        "wg",
        "set",
        settings.WIREGUARD_INTERFACE,
        "peer",
        client.public_key,
        "allowed-ips",
        f"{client.assigned_ip}/32",
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        logger.info("Successfully registered peer %s on %s", client.public_key, settings.WIREGUARD_INTERFACE)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError, PermissionError) as exc:
        # Try sudo if permitted
        try:
            sudo_cmd = ["sudo", "-n"] + cmd
            subprocess.run(sudo_cmd, check=True, capture_output=True, text=True)
            logger.info("Successfully registered peer %s via sudo", client.public_key)
            return True
        except Exception:
            logger.warning("Could not register peer with wg CLI directly (permission or interface unavailable): %s", exc)
            return False


def remove_peer(user_id: UUID, db: Session) -> bool:
    """
    Remove client peer from the WireGuard wg0 interface and mark inactive in database.
    Command: wg set wg0 peer <pubkey> remove
    """
    client = db.query(WireGuardClient).filter(WireGuardClient.user_id == user_id).first()
    if not client:
        return False

    cmd = [
        "wg",
        "set",
        settings.WIREGUARD_INTERFACE,
        "peer",
        client.public_key,
        "remove",
    ]
    try:
        subprocess.run(cmd, capture_output=True, text=True)
    except Exception:
        try:
            subprocess.run(["sudo", "-n"] + cmd, capture_output=True, text=True)
        except Exception:
            pass

    client.is_active = False
    db.commit()
    return True


def get_status(db: Session) -> WireGuardStatusResponse:
    """
    Retrieve WireGuard server status, active peers, and transfer metrics.
    Correlates kernel wg output with PostgreSQL database client records.
    """
    server_pub = get_server_public_key()
    all_clients = db.query(WireGuardClient).filter(WireGuardClient.is_active.is_(True)).all()
    clients_by_pub = {c.public_key: c for c in all_clients}

    peer_statuses: List[WireGuardPeerStatus] = []

    # Attempt to read live metrics from wg show dump
    wg_dump_lines = []
    try:
        res = subprocess.run(
            ["wg", "show", settings.WIREGUARD_INTERFACE, "dump"],
            capture_output=True,
            text=True,
        )
        if res.returncode == 0:
            wg_dump_lines = res.stdout.strip().split("\n")
        else:
            sudo_res = subprocess.run(
                ["sudo", "-n", "wg", "show", settings.WIREGUARD_INTERFACE, "dump"],
                capture_output=True,
                text=True,
            )
            if sudo_res.returncode == 0:
                wg_dump_lines = sudo_res.stdout.strip().split("\n")
    except Exception as exc:
        logger.debug("Failed to execute wg show dump: %s", exc)

    # Parse dump lines (line 0 is interface, subsequent lines are peers)
    # Peer format: public_key, preshared_key, endpoint, allowed_ips, latest_handshake, transfer_rx, transfer_tx, persistent_keepalive
    live_peer_map = {}
    if len(wg_dump_lines) > 1:
        for line in wg_dump_lines[1:]:
            parts = line.split("\t")
            if len(parts) >= 7:
                pub = parts[0]
                endpoint = parts[2] if parts[2] != "(none)" else None
                rx = int(parts[5]) if parts[5].isdigit() else 0
                tx = int(parts[6]) if parts[6].isdigit() else 0
                handshake = int(parts[4]) if parts[4].isdigit() else 0
                live_peer_map[pub] = {
                    "endpoint": endpoint,
                    "rx": rx,
                    "tx": tx,
                    "handshake": handshake,
                }

    # Match database clients with live data
    for client in all_clients:
        user = client.user
        live_data = live_peer_map.get(client.public_key, {})
        rx = live_data.get("rx", client.bytes_sent or 0)
        tx = live_data.get("tx", client.bytes_received or 0)
        endpoint = live_data.get("endpoint")

        from datetime import datetime, timezone
        handshake_ts = live_data.get("handshake", 0)
        latest_hs = datetime.fromtimestamp(handshake_ts, tz=timezone.utc) if handshake_ts > 0 else client.last_handshake

        peer_statuses.append(
            WireGuardPeerStatus(
                public_key=client.public_key,
                assigned_ip=str(client.assigned_ip),
                user_id=user.id if user else None,
                username=user.username if user else "unknown",
                department=user.department if user else None,
                endpoint=endpoint,
                latest_handshake=latest_hs,
                transfer_rx=rx,
                transfer_tx=tx,
                is_connected=(endpoint is not None or handshake_ts > 0),
            )
        )

    return WireGuardStatusResponse(
        interface=settings.WIREGUARD_INTERFACE,
        server_ip=settings.WIREGUARD_SERVER_IP,
        port=settings.WIREGUARD_SERVER_PORT,
        public_key=server_pub,
        active_peers_count=len([p for p in peer_statuses if p.is_connected]),
        peers=peer_statuses,
    )
