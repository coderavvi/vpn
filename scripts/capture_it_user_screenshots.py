#!/usr/bin/env python3
"""
Create an IT Test User and Capture All IT Department Views.
Saves high-resolution screenshots in docs/screenshots/it_department/
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

BASE_URL = "http://localhost:5173"
API_URL = "http://localhost:8000/api"
OUTPUT_DIR = "/home/vboxuser/Desktop/vpn-project/docs/screenshots/it_department"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. Admin login to create user
admin_creds = {"username": "admin@vpn.local", "password": "NexusAuth#2024!v9X"}
req = urllib.request.Request(
    f"{API_URL}/auth/login",
    data=json.dumps(admin_creds).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    admin_auth = json.loads(resp.read().decode("utf-8"))
admin_token = admin_auth["access_token"]

# 2. Get IT role ID
req_roles = urllib.request.Request(f"{API_URL}/roles", headers={"Authorization": f"Bearer {admin_token}"})
with urllib.request.urlopen(req_roles) as resp:
    roles = json.loads(resp.read().decode("utf-8"))
it_role = next(r for r in roles if r["name"].lower() == "it")
it_role_id = it_role["id"]
print(f"[✓] Resolved IT Role ID: {it_role_id}")

# 3. Create IT test user
new_user_payload = {
    "username": "it_test_lead",
    "email": "it_test_lead@vpn.local",
    "full_name": "Alex Miller (Senior IT Engineer)",
    "department": "IT",
    "role_id": it_role_id,
    "password": "NexusPortal$8821!kL",
    "is_admin": False
}

try:
    req_create = urllib.request.Request(
        f"{API_URL}/users",
        data=json.dumps(new_user_payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {admin_token}"}
    )
    with urllib.request.urlopen(req_create) as resp:
        created_user = json.loads(resp.read().decode("utf-8"))
    print(f"[✓] Created IT Test User: {created_user['username']} ({created_user['email']})")
except urllib.error.HTTPError as e:
    err_body = e.read().decode("utf-8")
    if "already registered" in err_body or e.code == 400:
        print("[*] IT Test User already exists. Proceeding to login...")
    else:
        raise RuntimeError(f"Failed to create user: {err_body}")

# 4. Log in as the IT test user
it_creds = {"username": "it_test_lead@vpn.local", "password": "NexusPortal$8821!kL"}
req_it_login = urllib.request.Request(
    f"{API_URL}/auth/login",
    data=json.dumps(it_creds).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req_it_login) as resp:
    it_auth = json.loads(resp.read().decode("utf-8"))
print(f"[✓] Successfully authenticated as IT User: {it_auth['user']['full_name']}")

# 5. Launch headless Firefox with local TMPDIR
os.environ["TMPDIR"] = "/home/vboxuser/Desktop/vpn-project/tmp"
os.makedirs("/home/vboxuser/Desktop/vpn-project/tmp", exist_ok=True)

profile_dir = "/home/vboxuser/Desktop/vpn-project/tmp/ff_profile"
os.makedirs(profile_dir, exist_ok=True)

options = Options()
options.add_argument("--headless")
options.add_argument("--width=1920")
options.add_argument("--height=1080")
options.add_argument("-profile")
options.add_argument(profile_dir)

service = Service(executable_path="/snap/bin/geckodriver")
driver = webdriver.Firefox(service=service, options=options)
driver.set_window_size(1920, 1080)

try:
    def inject_session_and_navigate(path, delay=3):
        driver.get(f"{BASE_URL}/login")
        time.sleep(1)
        driver.execute_script(f"""
            localStorage.setItem('access_token', '{it_auth['access_token']}');
            localStorage.setItem('refresh_token', '{it_auth['refresh_token']}');
            localStorage.setItem('user_profile', JSON.stringify({json.dumps(it_auth['user'])}));
        """)
        driver.get(f"{BASE_URL}{path}")
        time.sleep(delay)

    # Screenshot 1: IT Department Portal
    print("[1/4] Capturing IT Department Portal...")
    inject_session_and_navigate("/departments/it", delay=3)
    p1 = os.path.join(OUTPUT_DIR, "it_01_department_portal.png")
    driver.save_screenshot(p1)
    print(f"[✓] Saved: {p1}")

    # Screenshot 2: IT User VPN Configuration
    print("[2/4] Capturing IT User VPN Configuration...")
    inject_session_and_navigate("/vpn-config", delay=3)
    p2 = os.path.join(OUTPUT_DIR, "it_02_vpn_configuration.png")
    driver.save_screenshot(p2)
    print(f"[✓] Saved: {p2}")

    # Screenshot 3: IT User blocked from HR Micro-Segment (403 Access Denied)
    print("[3/4] Capturing IT User -> HR Segment Block (403 Intercept)...")
    inject_session_and_navigate("/departments/hr", delay=3)
    p3 = os.path.join(OUTPUT_DIR, "it_03_access_denied_hr.png")
    driver.save_screenshot(p3)
    print(f"[✓] Saved: {p3}")

    # Screenshot 4: IT User blocked from Finance Micro-Segment (403 Access Denied)
    print("[4/4] Capturing IT User -> Finance Segment Block (403 Intercept)...")
    inject_session_and_navigate("/departments/finance", delay=3)
    p4 = os.path.join(OUTPUT_DIR, "it_04_access_denied_finance.png")
    driver.save_screenshot(p4)
    print(f"[✓] Saved: {p4}")

    print("\n[✓] All 4 IT Department screenshots successfully captured in:")
    print(f"    {OUTPUT_DIR}")

finally:
    driver.quit()
