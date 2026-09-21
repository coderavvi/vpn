# Complete System Commands & Operations Runbook

A step-by-step technical reference documenting all commands to install, configure, start, verify, and manage the **Secure Enterprise VPN & Role-Based Micro-Segmentation System**.

---

## 1. System Prerequisites & Dependencies

### 1.1 Operating System
- **OS:** Ubuntu 24.04 LTS (Kernel 6.8+)
- **System User:** `vboxuser` (or your Linux user)

### 1.2 Package Installation
Run the following commands to install required system packages, compilers, database, and network tools:

```bash
# Update package repositories
sudo apt update

# Install PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib

# Install WireGuard and nftables firewall utilities
sudo apt install -y wireguard wireguard-tools nftables iproute2

# Install Python 3.12, venv, and pip
sudo apt install -y python3 python3-venv python3-pip

# Install Node.js 20.x and npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 2. Privileges & System Network Configuration

### 2.1 Passwordless Sudo for WireGuard CLI
The FastAPI backend automates WireGuard peer generation (`wg set wg0 ...`) and peer persistence. Grant passwordless sudo to the application user:

```bash
# Allow application user (vboxuser) to run wg and wg-quick without password prompt
echo "$USER ALL=(ALL) NOPASSWD: /usr/bin/wg, /usr/bin/wg-quick" | sudo tee /etc/sudoers.d/wireguard
sudo chmod 0440 /etc/sudoers.d/wireguard

# Ensure /etc/wireguard directory and server public key have proper read permissions
sudo chmod 755 /etc/wireguard
sudo chmod 644 /etc/wireguard/server_public.key
```

### 2.2 Enable IPv4 Packet Forwarding
Enable kernel IPv4 packet forwarding for WireGuard and namespace routing:

```bash
# Immediate runtime activation
sudo sysctl -w net.ipv4.ip_forward=1

# Persist across reboots
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.d/99-ip-forward.conf
sudo sysctl -p /etc/sysctl.d/99-ip-forward.conf
```

### 2.3 WireGuard Server Keypair & Interface (`wg0`)
Generate the server keys and start the `wg0` interface if not already running:

```bash
# Generate server private and public keys
sudo mkdir -p /etc/wireguard
cd /etc/wireguard
sudo wg genkey | sudo tee server_private.key | wg pubkey | sudo tee server_public.key
sudo chmod 600 server_private.key
sudo chmod 644 server_public.key

# Create WireGuard configuration (/etc/wireguard/wg0.conf)
sudo bash -c 'cat <<EOF > /etc/wireguard/wg0.conf
[Interface]
Address = 10.10.0.1/24
ListenPort = 51820
PrivateKey = $(cat /etc/wireguard/server_private.key)
SaveConfig = false
EOF'

# Enable and bring up WireGuard interface
sudo systemctl enable --now wg-quick@wg0

# Inspect WireGuard interface status
sudo wg show wg0
```

---

## 3. Database Setup (PostgreSQL)

### 3.1 Start PostgreSQL Service
```bash
sudo systemctl enable --now postgresql
sudo systemctl status postgresql --no-pager
```

### 3.2 Create Database User & Database
```bash
sudo -u postgres psql <<EOF
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'vpnuser') THEN
      CREATE ROLE vpnuser WITH LOGIN PASSWORD 'NexusPg_2024_SecDB';
   END IF;
END
\$\$;

SELECT 'CREATE DATABASE vpndb OWNER vpnuser'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vpndb')\gexec

GRANT ALL PRIVILEGES ON DATABASE vpndb TO vpnuser;
ALTER DATABASE vpndb OWNER TO vpnuser;
EOF
```

### 3.3 Backend Virtual Environment & Dependencies
```bash
cd /home/vboxuser/Desktop/vpn-project/backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip and install pinned requirements
pip install --upgrade pip
pip install -r requirements.txt
```

### 3.4 Database Migrations (Alembic)
Apply all Alembic database schema migrations:

```bash
cd /home/vboxuser/Desktop/vpn-project/backend
./venv/bin/alembic upgrade head
```

### 3.5 Seed Database (Roles and Initial Accounts)
Seed enterprise roles (`Admin`, `HR`, `Finance`, `IT`) and the initial administrator account:

```bash
cd /home/vboxuser/Desktop/vpn-project/backend
PYTHONPATH=. ./venv/bin/python ../scripts/seed_db.py
```

---

## 4. Network Namespaces & Micro-Segmentation Setup

The architecture isolates departmental resources in three dedicated Linux Network Namespaces:
- **HR Namespace (`hr-ns`):** Subnet `10.20.10.0/24`, Target IP `10.20.10.2:9001`
- **Finance Namespace (`finance-ns`):** Subnet `10.20.20.0/24`, Target IP `10.20.20.2:9002`
- **IT Namespace (`it-ns`):** Subnet `10.20.30.0/24`, Target IP `10.20.30.2:9003`

### 4.1 Automated Setup Script
Run the automated script to build namespaces, veth pairs, routing, and mock HTTP servers:

```bash
cd /home/vboxuser/Desktop/vpn-project
sudo ./network/namespaces/setup-namespaces.sh
```

### 4.2 Manual Commands Executed by the Namespace Script
For reference, the script executes the following exact Linux networking commands:

```bash
# Enable IP forwarding
sysctl -w net.ipv4.ip_forward=1

# --- 1. HR Namespace ---
ip netns add hr-ns
ip link add veth-hr-root type veth peer name veth-hr-ns
ip link set veth-hr-ns netns hr-ns
ip addr add 10.20.10.1/24 dev veth-hr-root
ip link set veth-hr-root up
ip netns exec hr-ns ip addr add 10.20.10.2/24 dev veth-hr-ns
ip netns exec hr-ns ip link set veth-hr-ns up
ip netns exec hr-ns ip link set lo up
ip netns exec hr-ns ip route add default via 10.20.10.1
ip netns exec hr-ns nohup python3 -m http.server 9001 --directory /var/www/mock-portals/hr --bind 10.20.10.2 > /var/log/mock-hr.log 2>&1 &

# --- 2. Finance Namespace ---
ip netns add finance-ns
ip link add veth-fin-root type veth peer name veth-fin-ns
ip link set veth-fin-ns netns finance-ns
ip addr add 10.20.20.1/24 dev veth-fin-root
ip link set veth-fin-root up
ip netns exec finance-ns ip addr add 10.20.20.2/24 dev veth-fin-ns
ip netns exec finance-ns ip link set veth-fin-ns up
ip netns exec finance-ns ip link set lo up
ip netns exec finance-ns ip route add default via 10.20.20.1
ip netns exec finance-ns nohup python3 -m http.server 9002 --directory /var/www/mock-portals/finance --bind 10.20.20.2 > /var/log/mock-finance.log 2>&1 &

# --- 3. IT Operations Namespace ---
ip netns add it-ns
ip link add veth-it-root type veth peer name veth-it-ns
ip link set veth-it-ns netns it-ns
ip addr add 10.20.30.1/24 dev veth-it-root
ip link set veth-it-root up
ip netns exec it-ns ip addr add 10.20.30.2/24 dev veth-it-ns
ip netns exec it-ns ip link set veth-it-ns up
ip netns exec it-ns ip link set lo up
ip netns exec it-ns ip route add default via 10.20.30.1
ip netns exec it-ns nohup python3 -m http.server 9003 --directory /var/www/mock-portals/it --bind 10.20.30.2 > /var/log/mock-it.log 2>&1 &
```

### 4.3 Verify Namespaces & Links
```bash
# List active namespaces
ip netns list

# Check root veth links and IP addresses
ip -br addr show | grep -E "wg0|veth"
```

---

## 5. Firewall & Packet Filtering (`nftables`)

Load and verify the kernel-level micro-segmentation and VPN forwarding rules:

```bash
cd /home/vboxuser/Desktop/vpn-project

# Load complete nftables ruleset
sudo nft -f network/nftables/main.nft

# Inspect active ruleset
sudo nft list ruleset
```

---

## 6. Frontend Setup (React / Vite)

```bash
cd /home/vboxuser/Desktop/vpn-project/frontend

# Install Node dependencies
npm install

# Test production build
npm run build
```

---

## 7. Starting the Application Stack

### 7.1 Automated Startup (Recommended)
Use the included orchestration script to start all services under user systemd:

```bash
cd /home/vboxuser/Desktop/vpn-project
./scripts/start-services.sh
```

### 7.2 Manual Startup (For Interactive Debugging)

**Terminal 1 — FastAPI Backend:**
```bash
cd /home/vboxuser/Desktop/vpn-project/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — React / Vite Frontend:**
```bash
cd /home/vboxuser/Desktop/vpn-project/frontend
npm run dev -- --host 0.0.0.0
```

---

## 8. Service URLs & Port Bindings

| Service | Local URL | External / Host VM URL | Description |
|---|---|---|---|
| **Frontend UI** | `http://localhost:5173` | `http://192.168.56.101:5173` | React 18 / Tailwind Dashboard |
| **Backend API** | `http://localhost:8000` | `http://192.168.56.101:8000` | FastAPI REST API |
| **Swagger Docs** | `http://localhost:8000/docs` | `http://192.168.56.101:8000/docs` | Interactive API documentation |
| **ReDoc UI** | `http://localhost:8000/redoc` | `http://192.168.56.101:8000/redoc` | Alternative API docs |
| **WireGuard** | `10.10.0.1:51820/udp` | `192.168.56.101:51820/udp` | In-kernel VPN gateway |
| **HR Portal** | `10.20.10.2:9001` | *Namespace isolated* | `hr-ns` HTTP service |
| **Finance Portal** | `10.20.20.2:9002` | *Namespace isolated* | `finance-ns` HTTP service |
| **IT Portal** | `10.20.30.2:9003` | *Namespace isolated* | `it-ns` HTTP service |

---

## 9. Verification & Diagnostics

### 9.1 Check Systemd User Services
```bash
# View service status
systemctl --user status vpn-backend vpn-frontend

# View live backend logs
journalctl --user -u vpn-backend -f

# View live frontend logs
journalctl --user -u vpn-frontend -f
```

### 9.2 Check Listening Ports
```bash
ss -tulpn | grep -E "8000|5173|5432|51820"
```

### 9.3 Test HTTP Health Endpoints
```bash
# Backend docs health
curl -I http://localhost:8000/docs

# Frontend UI health
curl -I http://localhost:5173
```

### 9.4 Run Full Integration Test Suite
```bash
cd /home/vboxuser/Desktop/vpn-project/backend
./venv/bin/pytest tests/ -v
```

---

## 10. Client Public Key Management & Mandatory Peer Registration

### 10.1 Why Peer Registration and Saving Is Compulsory
WireGuard relies strictly on **Cryptokey Routing**:
1. **Silent Packet Dropping:** The server kernel module will **silently drop** all incoming UDP packets (including handshakes and pings) from any client whose public key is not registered in the server's live `wg0` peer table.
2. **Mandatory Persistence (`wg-quick save wg0`):** Commands like `sudo wg set wg0 peer ...` only exist in volatile kernel memory. **You MUST run `sudo wg-quick save wg0`** immediately after registering a peer so that the configuration is permanently written to `/etc/wireguard/wg0.conf`. Without this step, restarting `wg-quick@wg0` or rebooting the server wipes the peer table.

---

### 10.2 How the Client Finds & Copies Their Public Key

#### Method A: From the Web Portal (Recommended — 1 Click)
1. Sign in to the portal (`http://192.168.56.101:5173`) using your credentials.
2. Click **My VPN Config** in the left navigation sidebar.
3. Above the `.conf` file preview, a dedicated card displays:
   - **Your Client Public Key:** (e.g. `lun0vdCVhWYS/OjS0cNaDiD8LXnU/wPO5AkpmA6Q1mw=`).
   - A 1-click **"Copy Public Key"** button.
   - Your assigned VPN Tunnel IP (e.g. `10.10.0.3/32`).
   - The exact server registration command with your public key and IP pre-filled.

#### Method B: Inside the Official WireGuard App (Windows / macOS)
1. Open the WireGuard application on Windows/macOS and select your imported tunnel on the left list.
2. The tunnel details panel displays:
   ```text
   [Interface]
   Public key: <CLIENT_PUBLIC_KEY>
   Addresses: 10.10.0.X/32
   ```
   *(Note: WireGuard automatically computes this public key from your `PrivateKey`).*
3. Select and copy the **Public key**.

#### Method C: Derived from Configuration File via Command Line
If you have the downloaded `.conf` file (`wg0-<username>.conf`):

**Linux / macOS / WSL:**
```bash
grep -i "PrivateKey" wg0-<username>.conf | awk '{print $3}' | wg pubkey
```

**Windows PowerShell:**
```powershell
(Get-Content .\wg0-<username>.conf | Select-String "PrivateKey").Line.Split("=")[1].Trim() | wg pubkey
```

---

### 10.3 Mandatory Server Registration & Saving Commands

To register a client peer and make it permanent on the VPN server:

```bash
# 1. Register peer with assigned IP in kernel interface (wg0)
sudo wg set wg0 peer <CLIENT_PUBLIC_KEY> allowed-ips <CLIENT_ASSIGNED_IP>/32

# 2. COMPULSORY: Save interface state to /etc/wireguard/wg0.conf
sudo wg-quick save wg0

# 3. Verify registration
sudo wg show wg0
```

#### Real-World Example:
```bash
# Register user 'iamtabson' (Assigned IP 10.10.0.3)
sudo wg set wg0 peer lun0vdCVhWYS/OjS0cNaDiD8LXnU/wPO5AkpmA6Q1mw= allowed-ips 10.10.0.3/32

# Save to persist across reboots and service restarts
sudo wg-quick save wg0

# Verify peer appears in active WireGuard status
sudo wg show wg0
```

---

### 10.4 Automatic Peer Registration (Sudoers Configuration)

To eliminate the need for manual `sudo wg set` and `sudo wg-quick save` commands, configure passwordless sudo for the application user (`vboxuser`):

```bash
# Grant passwordless sudo for wg and wg-quick
echo "$USER ALL=(ALL) NOPASSWD: /usr/bin/wg, /usr/bin/wg-quick" | sudo tee /etc/sudoers.d/wireguard
sudo chmod 0440 /etc/sudoers.d/wireguard

# Grant read access to the server key
sudo chmod 755 /etc/wireguard
sudo chmod 644 /etc/wireguard/server_public.key
```

Once configured, the FastAPI backend will **automatically execute peer registration and saving** whenever a new user is created or generates configuration.

---

## 11. Credentials & Lockout Settings

### 11.1 Standard Test Accounts

| Role | Username / Identifier | Password | Access Segment |
|---|---|---|---|
| **Administrator** | `admin` or `admin@vpn.local` | `NexusAuth#2024!v9X` | Full Access + Admin Console |
| **HR Specialist** | `portal_hr_user` | `NexusPortal$8821!kL` | `hr-ns` (`10.20.10.0/24:9001`) |
| **Finance Analyst** | `fin_user` | `NexusPortal$8821!kL` | `finance-ns` (`10.20.20.0/24:9002`) |
| **IT Engineer** | `it_user` | `NexusPortal$8821!kL` | `it-ns` (`10.20.30.0/24:9003`) |

### 11.2 Lockout Configuration (`backend/app/config.py`)
- **Lockout Duration:** `ACCOUNT_LOCKOUT_MINUTES = 1` (1 minute lockout)
- **Max Failed Attempts:** `MAX_FAILED_LOGIN_ATTEMPTS = 5`

### 11.3 Quick Reset of Database Lockout Counters
If an account gets locked during testing, reset it via:

```bash
cd /home/vboxuser/Desktop/vpn-project/backend
./venv/bin/python -c "
from app.database import SessionLocal
from app.models import User
db = SessionLocal()
for u in db.query(User).filter((User.locked_until != None) | (User.failed_login_attempts > 0)).all():
    u.locked_until = None
    u.failed_login_attempts = 0
db.commit()
db.close()
print('All account lockouts cleared.')
"
```

---

## 12. Stopping the Application Stack

### 12.1 Stop Services via Automation Script
```bash
cd /home/vboxuser/Desktop/vpn-project
./scripts/stop-services.sh
```

### 12.2 Teardown Namespaces Manually (with Sudo)
```bash
cd /home/vboxuser/Desktop/vpn-project
sudo ./network/namespaces/teardown-namespaces.sh
```

---

## 13. Troubleshooting & Common Issues

### 13.1 WireGuard Config Generation Fails After Creating User (HTTP 500)
**Cause:**
1. `/etc/wireguard` has restricted `0700` permissions, preventing the backend from reading `/etc/wireguard/server_public.key`.
2. Passwordless sudo is not configured for `vboxuser`, causing `sudo wg set wg0 ...` to fail with a password prompt.

**Commands to Run:**
```bash
# 1. Grant passwordless sudo for WireGuard CLI tools
echo "$USER ALL=(ALL) NOPASSWD: /usr/bin/wg, /usr/bin/wg-quick" | sudo tee /etc/sudoers.d/wireguard
sudo chmod 0440 /etc/sudoers.d/wireguard

# 2. Make directory and public key readable
sudo chmod 755 /etc/wireguard
sudo chmod 644 /etc/wireguard/server_public.key

# 3. Restart the backend service
systemctl --user restart vpn-backend
```

**Code-Level Protection:**
The backend (`backend/app/services/wireguard_service.py`) automatically falls back to `WIREGUARD_SERVER_PUBKEY` from `backend/.env` if `/etc/wireguard/server_public.key` cannot be accessed, and attempts peer registration non-blockingly so client configuration generation succeeds even when sudo rights are still pending.

### 13.2 Ping to 10.10.0.1 Fails from Client (Windows / macOS)
**Symptom:** The client imported the tunnel profile, but `ping 10.10.0.1` returns `Request timed out` or `General failure`.

**Cause 1: Endpoint points to Localhost (`127.0.0.1:51820`):**
If the configuration was generated with `127.0.0.1`, the client machine is trying to connect to itself rather than the VPN server VM.
- **Fix:** In the client config, set `Endpoint = 192.168.56.101:51820` (the VM's Host-Only network IP).

**Cause 2: Client Public Key is not registered or saved in `wg0`:**
WireGuard silently ignores handshakes from unknown keys.
- **Fix:** Register and save the client's public key on the VPN server:
  ```bash
  sudo wg set wg0 peer <CLIENT_PUBLIC_KEY> allowed-ips <CLIENT_ASSIGNED_IP>/32
  sudo wg-quick save wg0
  ```

**Cause 3: Verifying Active Handshake:**
On the VPN server, run:
```bash
sudo wg show wg0
```
Look for the peer's entry. A healthy, working tunnel will display:
```text
peer: <CLIENT_PUBLIC_KEY>
  endpoint: 192.168.56.1:PORT
  allowed ips: 10.10.0.X/32
  latest handshake: 12 seconds ago
  transfer: 4.20 KiB received, 3.85 KiB sent
```
If `latest handshake` is missing or says `never`, check that the `Endpoint` IP is reachable from the client and port `51820/udp` is open.

