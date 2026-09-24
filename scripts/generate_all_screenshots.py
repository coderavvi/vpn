#!/usr/bin/env python3
"""
Automated Screenshot Generator for Academic Dissertation Chapters 4 & 5.
Captures high-resolution, full-page screenshots of all key views in the
Secure Enterprise VPN & Micro-Segmentation system.
"""

import os
import sys
import json
import time
import urllib.request
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = "http://localhost:5173"
API_URL = "http://localhost:8000/api"
DOCS_URL = "http://localhost:8000/docs"
OUTPUT_DIR = "/home/vboxuser/Desktop/vpn-project/docs/screenshots"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Credentials
ADMIN_USER = {"username": "admin@vpn.local", "password": "NexusAuth#2024!v9X"}
HR_USER = {"username": "hr_user@vpn.local", "password": "NexusPortal$8821!kL"}
FIN_USER = {"username": "fin_user@vpn.local", "password": "NexusPortal$8821!kL"}

def get_tokens(creds):
    req = urllib.request.Request(
        f"{API_URL}/auth/login",
        data=json.dumps(creds).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        if resp.status == 200:
            return json.loads(resp.read().decode("utf-8"))
    raise RuntimeError(f"Login failed for {creds['username']}")

def main():
    print("[*] Fetching JWT auth tokens for admin, HR, and finance...")
    admin_auth = get_tokens(ADMIN_USER)
    hr_auth = get_tokens(HR_USER)
    fin_auth = get_tokens(FIN_USER)

    options = Options()
    options.add_argument("--headless")
    options.add_argument("--width=1920")
    options.add_argument("--height=1080")

    service = Service(executable_path="/snap/bin/geckodriver")
    driver = webdriver.Firefox(service=service, options=options)
    driver.set_window_size(1920, 1080)

    try:
        # Helper to set localStorage and load page
        def inject_session_and_navigate(auth_data, path, delay=3):
            driver.get(f"{BASE_URL}/login")
            time.sleep(1)
            # Inject auth into localStorage
            driver.execute_script(f"""
                localStorage.setItem('access_token', '{auth_data['access_token']}');
                localStorage.setItem('refresh_token', '{auth_data['refresh_token']}');
                localStorage.setItem('user_profile', JSON.stringify({json.dumps(auth_data['user'])}));
            """)
            driver.get(f"{BASE_URL}{path}")
            time.sleep(delay)

        # 1. Login Page
        print("[1/13] Capturing Login Page...")
        driver.get(f"{BASE_URL}/login")
        driver.delete_all_cookies()
        driver.execute_script("localStorage.clear();")
        driver.get(f"{BASE_URL}/login")
        time.sleep(2)
        driver.save_screenshot(os.path.join(OUTPUT_DIR, "01_login_page.png"))

        # 2. Admin Overview Dashboard
        print("[2/13] Capturing Admin Overview Dashboard...")
        inject_session_and_navigate(admin_auth, "/", delay=3)
        driver.save_screenshot(os.path.join(OUTPUT_DIR, "02_admin_dashboard.png"))

        # 3. HR Department Portal
        print("[3/13] Capturing HR Department Portal...")
        inject_session_and_navigate(admin_auth, "/departments/hr", delay=3)
        driver.save_screenshot(os.path.join(OUTPUT_DIR, "03_hr_department_portal.png"))

        # 4. Finance Department Portal
        print("[4/13] Capturing Finance Department Portal...")
        inject_session_and_navigate(admin_auth, "/departments/finance", delay=3)
        driver.save_screenshot(os.path.join(OUTPUT_DIR, "04_finance_department_portal.png"))

        # 5. IT Operations Portal
        print("[5/13] Capturing IT Operations Portal...")
        inject_session_and_navigate(admin_auth, "/departments/it", delay=3)
        driver.save_screenshot(os.path.join(OUTPUT_DIR, "05_it_operations_portal.png"))

        # 6. Micro-Segmentation Access Denied (403 Violation Intercept)
        # HR user attempts to access /departments/finance
        print("[6/13] Capturing Micro-Segmentation 403 Access Denied...")
        inject_session_and_navigate(hr_auth, "/departments/finance", delay=3)
        driver.save_screenshot(os.path.join(OUTPUT_DIR, "06_microsegmentation_access_denied.png"))

        # 7. VPN Client Configuration
        print("[7/14] Capturing VPN Client Configuration...")
        inject_session_and_navigate(admin_auth, "/vpn-config", delay=3)
        driver.save_screenshot(os.path.join(OUTPUT_DIR, "07_vpn_client_configuration.png"))

        # 8. WireGuard Server Telemetry & Peer Management
        print("[8/14] Capturing WireGuard Telemetry...")
        inject_session_and_navigate(admin_auth, "/admin/wireguard", delay=3)
        driver.save_screenshot(os.path.join(OUTPUT_DIR, "08_wireguard_telemetry.png"))

        # 9. Active Sessions Monitoring
        print("[9/14] Capturing Active Sessions...")
        inject_session_and_navigate(admin_auth, "/admin/sessions", delay=3)
        driver.save_screenshot(os.path.join(OUTPUT_DIR, "09_active_sessions_monitoring.png"))

        # 10. Security Audit & Access Violation Logs
        print("[10/14] Capturing Security Audit Logs...")
        inject_session_and_navigate(admin_auth, "/admin/logs", delay=3)
        driver.save_screenshot(os.path.join(OUTPUT_DIR, "10_security_audit_logs.png"))

        # 11. User Directory Management
        print("[11/14] Capturing User Directory...")
        inject_session_and_navigate(admin_auth, "/admin/users", delay=3)
        driver.save_screenshot(os.path.join(OUTPUT_DIR, "11_user_directory_management.png"))

        # 12. Roles & Micro-Segmentation Policies
        print("[12/14] Capturing Roles & Policies...")
        inject_session_and_navigate(admin_auth, "/admin/roles", delay=3)
        driver.save_screenshot(os.path.join(OUTPUT_DIR, "12_roles_and_segmentation_policies.png"))

        # 13. Portals Verification Console
        print("[13/14] Capturing Portals Testing Console...")
        inject_session_and_navigate(admin_auth, "/portals", delay=3)
        driver.save_screenshot(os.path.join(OUTPUT_DIR, "13_portals_verification_console.png"))

        # 14. Interactive Swagger API Documentation
        print("[14/14] Capturing Swagger API Docs...")
        driver.get(DOCS_URL)
        time.sleep(3)
        driver.save_screenshot(os.path.join(OUTPUT_DIR, "14_swagger_api_documentation.png"))

        print("\n[✓] All 13 screenshots successfully generated and saved to:")
        print(f"    {OUTPUT_DIR}")

    finally:
        driver.quit()

if __name__ == "__main__":
    main()
