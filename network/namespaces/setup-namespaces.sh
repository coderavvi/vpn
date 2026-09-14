#!/bin/bash
# ==============================================================================
# setup-namespaces.sh
# Creates Linux Network Namespaces for Role-Based Micro-Segmentation.
# Segments:
#   - hr-ns:       Subnet 10.20.10.0/24, Portal Port 9001
#   - finance-ns:  Subnet 10.20.20.0/24, Portal Port 9002
#   - it-ns:       Subnet 10.20.30.0/24, Portal Port 9003
# ==============================================================================

set -e

# Ensure script is executed with root privileges
if [ "$EUID" -ne 0 ]; then
    echo "[!] Please run as root (or with sudo)"
    exec sudo "$0" "$@"
fi

echo "[*] Enabling IPv4 forwarding..."
sysctl -w net.ipv4.ip_forward=1 > /dev/null

DEPARTMENTS=(
    "hr:10:9001:HR Department Portal:Employee Records, Payroll, Benefits Administration"
    "finance:20:9002:Finance Department Portal:Accounts Payable, Financial Statements, Budgets"
    "it:30:9003:IT Operations Portal:Infrastructure Monitoring, Active Directory, Server Nodes"
)

mkdir -p /var/www/mock-portals

for dept_info in "${DEPARTMENTS[@]}"; do
    IFS=":" read -r NAME OCTET PORT TITLE DESC <<< "${dept_info}"

    NS="${NAME}-ns"
    VETH_ROOT="veth-${NAME}-root"
    VETH_NS="veth-${NAME}-ns"
    IP_ROOT="10.20.${OCTET}.1"
    IP_NS="10.20.${OCTET}.2"

    echo "[*] Configuring ${NS} (${IP_NS}:Port ${PORT})..."

    # Delete namespace if already exists (clean slate)
    if ip netns list | grep -q "^${NS}\b"; then
        echo "    Namespace ${NS} already exists, tearing down old instance..."
        ip netns exec "${NS}" pkill -f "python3 -m http.server ${PORT}" 2>/dev/null || true
        ip netns delete "${NS}" 2>/dev/null || true
    fi
    ip link delete "${VETH_ROOT}" 2>/dev/null || true

    # Create Namespace
    ip netns add "${NS}"

    # Create veth pair connecting root namespace and child namespace
    ip link add "${VETH_ROOT}" type veth peer name "${VETH_NS}"
    ip link set "${VETH_NS}" netns "${NS}"

    # Configure Host/Root namespace interface
    ip addr add "${IP_ROOT}/24" dev "${VETH_ROOT}"
    ip link set "${VETH_ROOT}" up

    # Configure Child namespace interfaces
    ip netns exec "${NS}" ip addr add "${IP_NS}/24" dev "${VETH_NS}"
    ip netns exec "${NS}" ip link set "${VETH_NS}" up
    ip netns exec "${NS}" ip link set lo up

    # Set default gateway inside namespace pointing back to root veth
    ip netns exec "${NS}" ip route add default via "${IP_ROOT}"

    # Create HTML response for mock HTTP portal
    PORTAL_DIR="/var/www/mock-portals/${NAME}"
    mkdir -p "${PORTAL_DIR}"
    cat <<EOF > "${PORTAL_DIR}/index.html"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${TITLE}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
        .card { background: #1e293b; border-radius: 8px; padding: 1.5rem; max-width: 600px; margin: 2rem auto; border: 1px solid #334155; }
        h1 { color: #38bdf8; margin-top: 0; }
        .badge { background: #0284c7; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: bold; }
        .info { margin-top: 1rem; color: #94a3b8; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="card">
        <span class="badge">${NS}</span>
        <h1>${TITLE}</h1>
        <p class="info"><strong>Allowed Micro-Segment:</strong> ${IP_NS} / 10.20.${OCTET}.0/24</p>
        <p class="info"><strong>Listening Port:</strong> ${PORT}</p>
        <p class="info"><strong>Description:</strong> ${DESC}</p>
        <hr style="border: 0; border-top: 1px solid #334155; margin: 1.5rem 0;">
        <p style="color: #4ade80; font-size: 0.875rem;">✓ Access Granted: Role-based segment verification successful.</p>
    </div>
</body>
</html>
EOF

    # Start mock Python HTTP server inside namespace
    ip netns exec "${NS}" nohup python3 -m http.server "${PORT}" --directory "${PORTAL_DIR}" --bind "${IP_NS}" > "/var/log/mock-${NAME}.log" 2>&1 &

    echo "    [✓] ${NS} up and listening on ${IP_NS}:${PORT}"
done

echo ""
echo "[✓] All Network Namespaces and Mock Portals configured successfully."
echo "    Active Namespaces:"
ip netns list
echo "    Network links:"
ip -br link | grep veth || true
