#!/bin/bash
# ==============================================================================
# start-services.sh
# Starts all components of the Secure Enterprise VPN system:
# 1. PostgreSQL (verification)
# 2. Network Namespaces & Mock Portals
# 3. FastAPI Backend (port 8000)
# 4. Vite React Frontend (port 5173)
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_ROOT}"

echo "================================================================="
echo "   Starting Secure Enterprise VPN & Micro-Segmentation System   "
echo "================================================================="

# 1. Verify PostgreSQL is active
if systemctl is-active --quiet postgresql; then
    echo "[✓] PostgreSQL service is active."
else
    echo "[!] PostgreSQL service is not active. Attempting start..."
    sudo -n systemctl start postgresql 2>/dev/null || true
fi

# 2. Setup Network Namespaces and Mock Portals
echo "[*] Setting up network namespaces and departmental portals..."
if [ -f "network/namespaces/setup-namespaces.sh" ]; then
    sudo -n ./network/namespaces/setup-namespaces.sh 2>/dev/null || echo "[!] Notice: sudo required for network namespaces setup (can be run separately with sudo)"
fi

# 3. Start Backend Uvicorn Server
echo "[*] Starting FastAPI Backend on http://0.0.0.0:8000..."
systemctl --user stop vpn-backend 2>/dev/null || true
systemd-run --user --unit=vpn-backend --property=WorkingDirectory="${PROJECT_ROOT}/backend" \
    "${PROJECT_ROOT}/backend/venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000
echo "[✓] Backend service running (unit: vpn-backend, port: 8000)"

# 4. Start Frontend Vite Development Server
echo "[*] Starting React / Vite Frontend on http://0.0.0.0:5173..."
if [ -d "${PROJECT_ROOT}/frontend/node_modules" ]; then
    systemctl --user stop vpn-frontend 2>/dev/null || true
    systemd-run --user --unit=vpn-frontend --property=WorkingDirectory="${PROJECT_ROOT}/frontend" \
        "${PROJECT_ROOT}/frontend/node_modules/.bin/vite" --host 0.0.0.0
    echo "[✓] Frontend service running (unit: vpn-frontend, port: 5173)"
else
    echo "[!] Frontend node_modules not yet installed. Run 'cd frontend && npm install' first."
fi

echo "================================================================="
echo "[✓] All services initiated successfully!"
echo "    - Backend API:    http://localhost:8000"
echo "    - API Docs:       http://localhost:8000/docs"
echo "    - Frontend UI:    http://localhost:5173"
echo "================================================================="
