# System Architecture & Technical Specifications

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Host["Host Operating System (Ubuntu 24.04 LTS)"]
        subgraph WebClient["Client Web Layer"]
            UI["Vite + React 18 UI<br/>Port 5173"]
        end

        subgraph BackendLayer["Application Layer"]
            API["FastAPI Backend (Uvicorn)<br/>Port 8000"]
            RBAC["RBAC & Middleware<br/>JWT Authentication"]
            Monitor["Telemetry Monitor Daemon<br/>WireGuard + Firewall Poller"]
        end

        subgraph StorageLayer["Data Layer"]
            DB[(PostgreSQL 16 Database<br/>vpndb : 5432)]
        end

        subgraph NetworkLayer["Kernel & Networking Subsystem"]
            WG["WireGuard Gateway Interface<br/>wg0 (10.10.0.1/24) : 51820 UDP"]
            NFT["nftables In-Kernel Firewall<br/>inet filter (input/forward)"]
        end

        subgraph Namespaces["Isolated Network Namespaces"]
            subgraph HR_NS["hr-ns"]
                VETH_HR["veth-hr-ns<br/>10.20.10.2/24"]
                HR_PORTAL["Mock HR Portal<br/>Port 9001"]
            end
            subgraph FIN_NS["finance-ns"]
                VETH_FIN["veth-finance-ns<br/>10.20.20.2/24"]
                FIN_PORTAL["Mock Finance Portal<br/>Port 9002"]
            end
            subgraph IT_NS["it-ns"]
                VETH_IT["veth-it-ns<br/>10.20.30.2/24"]
                IT_PORTAL["Mock IT Portal<br/>Port 9003"]
            end
        end
    end

    UI -->|HTTP / JSON REST API| API
    API -->|Session & Auth Queries| DB
    API -->|Key Generation & Peer Mgmt| WG
    Monitor -->|Sync Active Sessions| WG
    Monitor -->|Log Access Violations| DB
    WG -->|Ingress VPN Traffic| NFT
    NFT -->|Allowed HR Traffic| HR_NS
    NFT -->|Allowed Finance Traffic| FIN_NS
    NFT -->|Allowed IT Traffic| IT_NS
    NFT -->|Drop & Log Unauthorized Traffic| Monitor
```

---

## 2. Micro-Segmentation Subnet & Port Allocations

| Micro-Segment | Namespace | Subnet CIDR | Portal IP & Port | Allowed Role | Isolation Policy |
|---|---|---|---|---|---|
| **VPN Overlay** | Root | `10.10.0.0/24` | `10.10.0.1:51820` | All authenticated | Client gateway |
| **Human Resources** | `hr-ns` | `10.20.10.0/24` | `10.20.10.2:9001` | HR, Admin | Drops cross-namespace and non-HR traffic |
| **Finance** | `finance-ns` | `10.20.20.0/24` | `10.20.20.2:9002` | Finance, Admin | Drops cross-namespace and non-Finance traffic |
| **IT Operations** | `it-ns` | `10.20.30.0/24` | `10.20.30.2:9003` | IT, Admin | Drops cross-namespace and non-IT traffic |

---

## 3. WireGuard Peer Cryptography & Allocation Policy
- **Key Generation:** Standard Curve25519 key pairs generated via `cryptography.hazmat.primitives.asymmetric.x25519`.
- **Key Storage:** Server public key is plaintext in the database; private key is encrypted at rest using AES-128-CBC / HMAC-SHA256 (Fernet) configured with `SECRET_KEY`.
- **IP Allocation:** Consecutive host IP assignment in `10.10.0.0/24` starting from `10.10.0.2` through `10.10.0.254`.
- **Client Configuration Generation:** Client configuration dynamically injects `AllowedIPs` tailored to the user's role:
  - HR User: `10.10.0.0/24, 10.20.10.0/24`
  - Finance User: `10.10.0.0/24, 10.20.20.0/24`
  - IT User: `10.10.0.0/24, 10.20.30.0/24`
  - Admin User: `10.10.0.0/24, 10.20.10.0/24, 10.20.20.0/24, 10.20.30.0/24`

---

## 4. Firewall Rule Model (`nftables`)
The `nftables` configuration is divided into:
- **`input` chain (policy: drop):** Permits SSH (22), WireGuard (51820/udp), Web UI and API (5173, 8000), loopback, and established connections. Drops and logs all other ingress traffic.
- **`forward` chain (policy: drop):**
  - Admins can forward packets to all micro-segments (`10.20.10.0/24`, `10.20.20.0/24`, `10.20.30.0/24`).
  - HR clients can forward packets ONLY to `10.20.10.0/24:9001`.
  - Finance clients can forward packets ONLY to `10.20.20.0/24:9002`.
  - IT clients can forward packets ONLY to `10.20.30.0/24:9003`.
  - Zero-Trust East-West rule (`ip saddr 10.20.0.0/16 ip daddr 10.20.0.0/16 counter drop`) prohibits lateral movement between departments.
  - Logging rule `counter log prefix "[NFT-FWD-DROP] " drop` records every unauthorized packet.
- **`postrouting` chain (NAT):** Masquerades outgoing traffic from `10.10.0.0/24` and `10.20.0.0/16`.

---

## 5. Security & Audit Logging Engine
The system maintains 2 levels of audit trails:
1. **Audit Logs (`audit_logs` table):**
   - User authentication success/failure.
   - Account lockout events (after 5 failed attempts).
   - User creation, update, activation, deactivation, deletion.
   - Role modifications.
2. **Access Violation Logs (`access_violations` table):**
   - Blocked lateral movement or unauthorized micro-segment accesses.
   - Real-time logging through both FastAPI RBAC exceptions and kernel firewall drop parsers.
   - Displayed in real-time in the admin Security Logs UI.
