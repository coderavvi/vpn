# Secure Enterprise Virtual Private Network (VPN) Using Role-Based Micro-Segmentation

A zero-trust enterprise VPN and micro-segmentation system built entirely on Linux primitives (WireGuard, `nftables`, Linux Network Namespaces), FastAPI (Python 3.12), PostgreSQL 16, and React/Vite/TailwindCSS.

---

## 🛡️ Architecture & Principles

This system enforces strict **Zero-Trust Role-Based Micro-Segmentation**:
1. **Zero-Trust Network Access (ZTNA):** All corporate resources are hidden behind isolated Linux network namespaces.
2. **Role-Based Segmentation:**
   - **HR Role:** Restricted to `hr-ns` (`10.20.10.0/24`, port `9001`).
   - **Finance Role:** Restricted to `finance-ns` (`10.20.20.0/24`, port `9002`).
   - **IT Role:** Restricted to `it-ns` (`10.20.30.0/24`, port `9003`).
   - **Admin Role:** Full administrative privileges across all departmental micro-segments.
3. **Dual-Layer Enforcement:**
   - **Network Layer (`nftables`):** In-kernel packet filtering drops any unauthorized forwarding or cross-namespace east-west traffic and logs drops directly to `dmesg`.
   - **Application Layer (FastAPI & RBAC):** Portal endpoints verify role claims, block unauthorized requests with HTTP 403 Forbidden, and log events to PostgreSQL `access_violations`.
4. **Autonomous Telemetry & Monitoring:**
   - Background daemon loops poll WireGuard interface counters (`wg show wg0 dump`) to manage real-time session lifecycles.
   - Disconnecting the VPN or inactivity automatically terminates active sessions.
   - Firewall drops and API violations are consolidated in the administrative security audit dashboard.

---

## 📁 Repository Structure

```
vpn-project/
├── backend/
│   ├── alembic/                # Database migrations (PostgreSQL 16)
│   ├── app/
│   │   ├── middleware/         # JWT and RBAC enforcement middleware
│   │   ├── models/             # SQLAlchemy ORM models (8 core relations)
│   │   ├── routers/            # FastAPI routers (auth, users, roles, wireguard, sessions, logs, portals)
│   │   ├── schemas/            # Pydantic validation schemas
│   │   ├── services/           # Business logic (crypto, wireguard, rbac, monitoring)
│   │   ├── config.py           # Pydantic settings & environment configuration
│   │   ├── database.py         # Database engine and sessionmaker
│   │   └── main.py             # Application lifespan and routing entrypoint
│   ├── tests/                  # 15 comprehensive pytest suites
│   ├── requirements.txt        # Pinned Python dependencies
│   └── alembic.ini             # Alembic migration configuration
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI components (Navbar, Sidebar, ProtectedRoute, Modal, StatCard)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── pages/              # UI Pages (Login, Dashboard, Portals, VPNConfig, Users, Roles, WireGuard, Sessions, Logs)
│   │   ├── services/           # Axios API client with automatic token refresh
│   │   ├── store/              # Zustand global authentication store
│   │   ├── App.jsx             # React Router routing configuration
│   │   └── index.css           # TailwindCSS styling
│   ├── dist/                   # Production-ready Vite build assets
│   ├── vite.config.js          # Vite configuration
│   └── package.json            # Node.js dependencies (React 18, Tailwind 3, Lucide)
├── network/
│   ├── namespaces/
│   │   ├── setup-namespaces.sh    # Creates hr-ns, finance-ns, it-ns and spawns portal servers
│   │   └── teardown-namespaces.sh # Cleans up veth pairs and namespaces
│   ├── nftables/
│   │   ├── main.nft               # Complete nftables firewall ruleset with logging
│   │   ├── vpn-rules.nft          # WireGuard input/forwarding policies
│   │   └── segmentation-rules.nft # Departmental micro-segmentation rules
│   └── wireguard/
│       ├── server_private.key     # Server WireGuard private key
│       └── server_public.key      # Server WireGuard public key
├── scripts/
│   ├── seed_db.py              # Seeds default roles and initial admin user
│   ├── start-services.sh       # Orchestrates full stack startup
│   └── stop-services.sh        # Orchestrates graceful teardown
└── docs/
    └── ARCHITECTURE.md         # In-depth architectural documentation
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **OS:** Ubuntu 24.04 LTS
- **PostgreSQL 16:** Database `vpndb` owned by user `vpnuser` with password configured in `.env`
- **WireGuard & nftables:** Installed via `sudo apt install wireguard-tools nftables`
- **Python:** 3.12+
- **Node.js:** 18+

### 2. Environment Setup & Seeding
```bash
# Setup backend virtual environment
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations and seed database
alembic upgrade head
python3 ../scripts/seed_db.py
```

### 3. Start All Services
Use the provided orchestration script to start PostgreSQL checks, network namespaces, the FastAPI backend, and the React frontend:
```bash
cd /home/vboxuser/vpn-project
./scripts/start-services.sh
```

- **Backend API:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **Frontend Dashboard:** `http://localhost:5173`

### 4. Stop Services
```bash
cd /home/vboxuser/vpn-project
./scripts/stop-services.sh
```

---

## 🔑 Seeded Roles and Segment Access

| Role | Default Account | Accessible Network Segment |
|---|---|---|
| **Administrator** | `admin@vpn.local` | All micro-segments + Admin Portal |
| **HR Specialist** | `hr_user@vpn.local` | `hr-ns` (`10.20.10.0/24:9001`) |
| **Finance Analyst**| `fin_user@vpn.local`| `finance-ns` (`10.20.20.0/24:9002`) |
| **IT Engineer** | `it_user@vpn.local` | `it-ns` (`10.20.30.0/24:9003`) |

> Set a secure password with at least 12 characters via `INITIAL_ADMIN_PASSWORD` and `INITIAL_USER_PASSWORD` in your environment prior to seeding.

---

## 🧪 Testing and Verification

Run the full pytest integration test suite:
```bash
cd backend
venv/bin/pytest tests/ -v
```

**Test Coverage (15 passed tests):**
- Authentication (Login, Refresh Tokens, Lockout, Me, Logout)
- User & Role Management (CRUD, Non-admin restrictions, Department assignment)
- WireGuard Integration (Keypair generation, Fernet encryption, Config formatting, Peer registration)
- Portals & Micro-Segmentation (Authorized segment access, 403 blocks, Automatic violation logging)
- Sessions & Telemetry (Active session listing, Disconnection endpoints, Audit and violation queries)
