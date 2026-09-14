#!/bin/bash
# ==============================================================================
# stop-services.sh
# Safely stops all components: backend, frontend, and network namespaces.
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_ROOT}"

echo "[*] Stopping Secure Enterprise VPN system services..."

# 1. Stop Frontend
if [ -f "${PROJECT_ROOT}/.frontend.pid" ]; then
    PID=$(cat "${PROJECT_ROOT}/.frontend.pid")
    echo "    Stopping frontend process (PID: ${PID})..."
    kill "${PID}" 2>/dev/null || true
    rm -f "${PROJECT_ROOT}/.frontend.pid"
fi
pkill -f "vite" 2>/dev/null || true

# 2. Stop Backend
if [ -f "${PROJECT_ROOT}/.backend.pid" ]; then
    PID=$(cat "${PROJECT_ROOT}/.backend.pid")
    echo "    Stopping backend process (PID: ${PID})..."
    kill "${PID}" 2>/dev/null || true
    rm -f "${PROJECT_ROOT}/.backend.pid"
fi
pkill -f "uvicorn app.main:app" 2>/dev/null || true

# 3. Teardown Network Namespaces
if [ -f "network/namespaces/teardown-namespaces.sh" ]; then
    echo "    Tearing down network namespaces..."
    sudo ./network/namespaces/teardown-namespaces.sh 2>/dev/null || echo "[!] Notice: sudo required for network namespaces teardown"
fi

echo "[✓] All services stopped."
