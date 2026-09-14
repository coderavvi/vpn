#!/bin/bash
# ==============================================================================
# teardown-namespaces.sh
# Destroys Linux Network Namespaces, veth pairs, and stops portal services.
# ==============================================================================

set -e

if [ "$EUID" -ne 0 ]; then
    echo "[!] Please run as root (or with sudo)"
    exec sudo "$0" "$@"
fi

echo "[*] Tearing down Network Namespaces..."

DEPARTMENTS=("hr" "finance" "it")

for NAME in "${DEPARTMENTS[@]}"; do
    NS="${NAME}-ns"
    VETH_ROOT="veth-${NAME}-root"

    echo "    Cleaning up ${NS}..."

    # Terminate background python servers in namespace
    if ip netns list | grep -q "^${NS}\b"; then
        ip netns exec "${NS}" pkill -f "python3 -m http.server" 2>/dev/null || true
        ip netns delete "${NS}" 2>/dev/null || true
    fi

    # Delete root-side veth interface if lingering
    ip link delete "${VETH_ROOT}" 2>/dev/null || true
done

echo "[✓] Teardown complete. Remaining namespaces:"
ip netns list || echo "None"
