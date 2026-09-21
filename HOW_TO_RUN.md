# How to Run — Secure Enterprise VPN & Micro-Segmentation System

This guide walks you through starting, operating, testing, and managing the Secure Enterprise VPN system, including the FastAPI backend, React (Vite) frontend, PostgreSQL database, WireGuard gateway, and departmental network namespaces.

---

## 1. System Requirements & Prerequisites

* **Operating System:** Ubuntu 24.04 LTS / Linux (Kernel 6.8+)
* **Python:** 3.12+ (Virtual environment in `backend/venv`)
* **Node.js:** 20.x+ & npm (Dependencies in `frontend/node_modules`)
* **Database:** PostgreSQL 16 (`vpndb` on port 5432)
* **Networking Subsystem:** `wireguard`, `wireguard-tools`, `nftables`, `iproute2`

---

## 2. Initial Privileges & Sudo Configuration

The backend automates WireGuard peer registration (`wg set wg0 ...`) and peers persistence (`wg-quick save wg0`). Because the application runs under the user account (`vboxuser`), grant passwordless sudo for the WireGuard CLI tools and ensure `/etc/wireguard` is accessible:

```bash
# 1. Grant passwordless sudo for wg and wg-quick
echo "vboxuser ALL=(ALL) NOPASSWD: /usr/bin/wg, /usr/bin/wg-quick" | sudo tee /etc/sudoers.d/wireguard

# 2. Ensure /etc/wireguard directory is readable for the server public key
sudo chmod 755 /etc/wireguard
```

Ensure the WireGuard interface `wg0` is running:
```bash
sudo systemctl enable --now wg-quick@wg0
sudo wg show
```

---

## 3. Quick Start (Automated Startup)

The project includes pre-configured automation scripts to launch or stop the complete stack:

### Start All Services
From the project root:
```bash
./scripts/start-services.sh
```
This script automatically:
1. Verifies that PostgreSQL is active on port 5432.
2. Initializes the isolated network namespaces (`hr-ns`, `finance-ns`, `it-ns`) and mock servers.
3. Launches the FastAPI backend on `http://0.0.0.0:8000`.
4. Launches the React / Vite frontend on `http://0.0.0.0:5173`.

### Stop All Services
```bash
./scripts/stop-services.sh
```

---

## 4. Manual Startup (Step-by-Step for Development)

If you prefer to run services in separate terminal tabs with live console logs:

### Step 4.1: Start PostgreSQL
```bash
sudo systemctl start postgresql
```

### Step 4.2: Setup Network Namespaces & Micro-Segments
```bash
sudo ./network/namespaces/setup-namespaces.sh
```
*Creates `hr-ns` (`10.20.10.2:9001`), `finance-ns` (`10.20.20.2:9002`), and `it-ns` (`10.20.30.2:9003`).*

### Step 4.3: Start FastAPI Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
* The backend will start on: **http://localhost:8000**
* Interactive Swagger API documentation: **http://localhost:8000/docs**

### Step 4.4: Start React / Vite Frontend
In a new terminal:
```bash
cd frontend
npm run dev -- --host 0.0.0.0
```
* The frontend will start on: **http://localhost:5173**

---

## 5. Application Endpoints

| Component | URL (Local) | URL (VM Network / Host) | Notes |
|---|---|---|---|
| **Frontend Web Portal** | [http://localhost:5173](http://localhost:5173) | `http://192.168.56.101:5173` | React 18 + Vite UI |
| **Backend REST API** | [http://localhost:8000](http://localhost:8000) | `http://192.168.56.101:8000` | FastAPI / Uvicorn |
| **Interactive API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | `http://192.168.56.101:8000/docs` | Swagger UI |
| **Alternative API Docs** | [http://localhost:8000/redoc](http://localhost:8000/redoc) | `http://192.168.56.101:8000/redoc` | ReDoc UI |

---

## 6. Pre-Seeded Test Credentials

Sign in using the credentials provisioned during database seeding or configured in your environment:

| Role | Username / Email | Password Source | Landing Page | Accessible Micro-Segment |
|---|---|---|---|---|
| **Administrator** | `admin@vpn.local` | Configured via `INITIAL_ADMIN_PASSWORD` in `.env` | `/` (Admin Dashboard) | Full access (`hr-ns`, `finance-ns`, `it-ns`, management) |
| **Human Resources** | `portal_hr_user` | Configured via `INITIAL_USER_PASSWORD` in `.env` | `/departments/hr` | `hr-ns` (`10.20.10.0/24:9001`) |
| **Finance** | `fin_user` | Configured via `INITIAL_USER_PASSWORD` in `.env` | `/departments/finance` | `finance-ns` (`10.20.20.0/24:9002`) |
| **IT Operations** | `it_user` | Configured via `INITIAL_USER_PASSWORD` in `.env` | `/departments/it` | `it-ns` (`10.20.30.0/24:9003`) |

---

## 7. Role-Based Verification & User Testing

### 7.1 HR User Workflow
1. Sign in with `portal_hr_user` and your configured user password.
2. Notice immediate redirect to `/departments/hr` (HR Portal).
3. The left sidebar shows **only** `HR Portal` and `My VPN Config`.
4. Test URL isolation: Type `http://localhost:5173/departments/finance` into your browser.
   * **Result:** Displays the **Micro-Segmentation Access Denied (HTTP 403)** page with target IP `10.20.20.2:9002`.
   * An `ACCESS_VIOLATION` event is logged in PostgreSQL.
   * Clicking "Go to My Department (Human Resources)" brings the user back.

### 7.2 Finance User Workflow
1. Sign in with `fin_user` and your configured user password.
2. Automatically redirected to `/departments/finance`.
3. Sidebar displays only `Finance Portal` and `My VPN Config`.
4. Access General Ledger, Accounts Payable, and Budget Allocations.

### 7.3 IT Operations User Workflow
1. Sign in with `it_user` and your configured user password.
2. Automatically redirected to `/departments/it`.
3. View Server Topology, Linux network namespaces, Support Ticket Queue, and run ICMP ping probes.

### 7.4 Administrator Workflow
1. Sign in with `admin@vpn.local` and your configured administrator password.
2. Access the Overview Dashboard, User Directory, Roles & Micro-Segments, WireGuard Telemetry, Active Sessions, and Security Audit Logs.
3. Open any department portal directly.

---

## 8. WireGuard Client Connection (Windows / Mac / Linux)

### Step 8.1: Download Configuration File
1. Sign in to the web app.
2. Navigate to **My VPN Config** (`/vpn-config`) or click **Download .conf**.
3. The downloaded file `wg0-<username>.conf` contains:
   * Client `PrivateKey` and `Address = 10.10.0.x/32`
   * `PublicKey` resolved from `WIREGUARD_SERVER_PUBKEY` in `.env` (or live `wg0` interface)
   * `Endpoint = 127.0.0.1:51820` (or your configured `VPN_ENDPOINT`)
   * Role-specific `AllowedIPs`

### Step 8.2: Verify Server Peer Registration
On the VM, verify the peer was automatically registered:
```bash
sudo wg show
```
You will see the peer's public key and assigned IP `10.10.0.x/32`.

### Step 8.3: Activate Tunnel on Client
1. Open the WireGuard Client application on your machine.
2. Click **Add Tunnel** &rarr; select the downloaded `wg0-<username>.conf`.
3. Click **Activate**.
4. Test connectivity from the client:
   ```cmd
   ping 10.10.0.1
   ```
   The VPN gateway responds directly with zero manual configuration.

---

## 9. Running Tests & Health Checks

### Run Backend Integration Tests
Execute the pytest suite inside the backend virtual environment:
```bash
backend/venv/bin/pytest backend/tests/ -v
```
*All 15 integration tests (`test_auth.py`, `test_portals.py`, `test_sessions_and_logs.py`, `test_users.py`, `test_wireguard.py`) will run and pass.*

### Check Service Logs
```bash
# Check backend service logs
systemctl --user status vpn-backend

# Check frontend service logs
systemctl --user status vpn-frontend

# Inspect live WireGuard kernel interface
sudo wg show wg0
```

### Reset Database (Optional)
To re-seed fresh demo users, roles, and initial audit records:
```bash
cd backend
PYTHONPATH=. ./venv/bin/python ../scripts/seed_db.py
```
