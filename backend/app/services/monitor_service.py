"""
Background Telemetry and Security Monitoring Service.
Periodically polls WireGuard interface metrics to maintain session states and
inspects nftables firewall logs for blocked micro-segmentation violations.
"""

import asyncio
import logging
import re
import subprocess
from datetime import datetime, timedelta, timezone
from typing import Dict, Any

from app.config import settings
from app.database import SessionLocal
from app.models import WireGuardClient, VPNSession, AccessViolation, User

logger = logging.getLogger("monitor_service")


def sync_wireguard_sessions():
    """
    Query WireGuard kernel module (wg show wg0 dump) and update active sessions and transfer metrics.
    Automatically creates new sessions upon handshake detection and closes stale sessions.
    """
    db = SessionLocal()
    try:
        cmd = ["wg", "show", settings.WIREGUARD_INTERFACE, "dump"]
        res = subprocess.run(cmd, capture_output=True, text=True)
        lines = []
        if res.returncode == 0:
            lines = res.stdout.strip().split("\n")
        else:
            sudo_res = subprocess.run(["sudo", "-n"] + cmd, capture_output=True, text=True)
            if sudo_res.returncode == 0:
                lines = sudo_res.stdout.strip().split("\n")

        if len(lines) <= 1:
            # Interface inactive or no peers registered yet
            return

        now = datetime.now(timezone.utc)

        # Peer line format: public_key, preshared_key, endpoint, allowed_ips, latest_handshake, transfer_rx, transfer_tx, persistent_keepalive
        for line in lines[1:]:
            parts = line.split("\t")
            if len(parts) < 7:
                continue

            pubkey = parts[0]
            endpoint = parts[2] if parts[2] != "(none)" else None
            handshake_ts = int(parts[4]) if parts[4].isdigit() else 0
            rx_bytes = int(parts[5]) if parts[5].isdigit() else 0
            tx_bytes = int(parts[6]) if parts[6].isdigit() else 0

            client = db.query(WireGuardClient).filter(WireGuardClient.public_key == pubkey).first()
            if not client:
                continue

            # Update client metrics
            client.bytes_sent = tx_bytes
            client.bytes_received = rx_bytes
            if handshake_ts > 0:
                client.last_handshake = datetime.fromtimestamp(handshake_ts, tz=timezone.utc)

            # Determine connection freshness (WireGuard handshakes happen every ~120s)
            handshake_age = (now.timestamp() - handshake_ts) if handshake_ts > 0 else 99999
            is_peer_connected = (handshake_ts > 0) and (handshake_age < 180)

            # Check existing active session for this client
            active_session = (
                db.query(VPNSession)
                .filter(
                    VPNSession.wireguard_client_id == client.id,
                    VPNSession.is_active.is_(True),
                )
                .first()
            )

            client_real_ip = endpoint.split(":")[0] if endpoint else None

            if is_peer_connected:
                if not active_session:
                    # New connection established
                    new_session = VPNSession(
                        user_id=client.user_id,
                        wireguard_client_id=client.id,
                        session_start=now,
                        client_real_ip=client_real_ip or "127.0.0.1",
                        assigned_vpn_ip=str(client.assigned_ip),
                        bytes_transferred=rx_bytes + tx_bytes,
                        is_active=True,
                    )
                    db.add(new_session)
                    logger.info("New active VPN session initiated for client: %s (%s)", client.assigned_ip, client.public_key)
                else:
                    # Update bytes on active session
                    active_session.bytes_transferred = rx_bytes + tx_bytes
            else:
                # Peer has been silent for > 180s; close active session if open
                if active_session:
                    active_session.is_active = False
                    active_session.session_end = now
                    if active_session.session_start:
                        active_session.duration_seconds = int((now - active_session.session_start).total_seconds())
                    active_session.disconnect_reason = "Tunnel Timeout / Disconnect"
                    logger.info("Closed timed-out VPN session for client: %s", client.assigned_ip)

        db.commit()
    except Exception as exc:
        db.rollback()
        logger.debug("WireGuard session sync encountered: %s", exc)
    finally:
        db.close()


def scan_firewall_logs():
    """
    Parse kernel log entries (dmesg) for nftables dropped packets:
    [NFT-FWD-DROP], [NFT-HR-DROP], [NFT-FIN-DROP], [NFT-IT-DROP].
    Extracts source, destination, port, and persists to access_violations.
    """
    db = SessionLocal()
    try:
        # Check dmesg for recent drops
        res = subprocess.run(["dmesg", "--ctime"], capture_output=True, text=True)
        if res.returncode != 0:
            return

        lines = res.stdout.split("\n")
        drop_pattern = re.compile(
            r"\[(NFT-[A-Z]+-DROP)\]\s+.*SRC=([0-9\.]+)\s+DST=([0-9\.]+)\s+.*PROTO=([A-Z0-9]+)\s+.*DPT=([0-9]+)"
        )

        now = datetime.now(timezone.utc)

        for line in lines[-100:]:  # Check latest 100 entries
            match = drop_pattern.search(line)
            if match:
                prefix, src_ip, dst_ip, proto, dpt = match.groups()
                dest_port = int(dpt)

                # Avoid duplicate insertion within last 10 minutes
                ten_mins_ago = now - timedelta(minutes=10)
                existing = (
                    db.query(AccessViolation)
                    .filter(
                        AccessViolation.vpn_client_ip == src_ip,
                        AccessViolation.destination_ip == dst_ip,
                        AccessViolation.destination_port == dest_port,
                        AccessViolation.created_at >= ten_mins_ago,
                    )
                    .first()
                )

                if not existing:
                    # Look up user by VPN client IP
                    client = db.query(WireGuardClient).filter(WireGuardClient.assigned_ip == src_ip).first()
                    user_id = client.user_id if client else None

                    violation = AccessViolation(
                        user_id=user_id,
                        vpn_client_ip=src_ip,
                        destination_ip=dst_ip,
                        destination_port=dest_port,
                        protocol=proto,
                        violation_type="NFTABLES_FORWARD_BLOCKED",
                        action_taken="DROP",
                        nftables_rule_matched=prefix,
                        created_at=now,
                    )
                    db.add(violation)
                    logger.warning("Captured and recorded firewall drop: %s -> %s:%s", src_ip, dst_ip, dest_port)

        db.commit()
    except Exception as exc:
        db.rollback()
        logger.debug("Firewall scan encountered: %s", exc)
    finally:
        db.close()


async def start_background_monitoring_loop():
    """
    Asynchronous daemon loop executing periodic session synchronization and log scanning.
    Runs every 20 seconds.
    """
    logger.info("Starting background VPN session and firewall monitor loop...")
    while True:
        try:
            sync_wireguard_sessions()
            scan_firewall_logs()
        except Exception as exc:
            logger.error("Error in background monitoring loop: %s", exc)
        await asyncio.sleep(20)
