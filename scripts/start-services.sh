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
    sudo systemctl start postgresql || true
fi

# 2. Setup Network Namespaces and Mock Portals
echo "[*] Setting up network namespaces and departmental portals..."
if [ -f "network/namespaces/setup-namespaces.sh" ]; then
    sudo ./network/namespaces/setup-namespaces.sh || echo "[!] Notice: sudo required for network namespaces setup"
fi

# 3. Start Backend Uvicorn Server
echo "[*] Starting FastAPI Backend on http://0.0.0.0:8000..."
cd "${PROJECT_ROOT}/backend"
source venv/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > "${PROJECT_ROOT}/backend.log" 2>&1 &
BACKEND_PID=$!
echo "${BACKEND_PID}" > "${PROJECT_ROOT}/.backend.pid"
echo "[✓] Backend running in background (PID: ${BACKEND_PID}, Logs: backend.log)"

# 4. Start Frontend Vite Development Server
echo "[*] Starting React / Vite Frontend..."
cd "${PROJECT_ROOT}/frontend"
if [ -d "node_modules" ]; then
    nohup npm run dev -- --host 0.0.0.0 > "${PROJECT_ROOT}/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo "${FRONTEND_PID}" > "${PROJECT_ROOT}/.frontend.pid"
    echo "[✓] Frontend running in background (PID: ${FRONTEND_PID}, Logs: frontend.log)"
else
    echo "[!] Frontend node_modules not yet installed. Run 'cd frontend && npm install' first."
fi

echo "================================================================="
echo "[✓] All services initiated successfully!"
echo "    - Backend API:    http://localhost:8000"
echo "    - API Docs:       http://localhost:8000/docs"
echo "    - Frontend UI:    http://localhost:5173"
echo "================================================================="
