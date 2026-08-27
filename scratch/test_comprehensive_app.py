import os
import sys
sys.path.insert(0, os.path.abspath('.'))

from fastapi.testclient import TestClient
from backend.main import app
from backend.core.database import SessionLocal
from backend.models.vendor import Vendor, VendorMenuItem

client = TestClient(app)

def test_public_endpoints():
    # 1. Public Settings
    r = client.get("/api/v1/settings/public")
    assert r.status_code == 200
    data = r.json()
    assert "demo_accounts_enabled" in data
    assert data["demo_accounts_enabled"] is True

    # 2. Public User Directory
    r = client.get("/api/v1/users/public-directory")
    assert r.status_code == 200
    users = r.json()
    assert isinstance(users, list)
    assert len(users) >= 10
    print(f"Verified {len(users)} public users from DB")

def test_vendor_menu_counts():
    db = SessionLocal()
    try:
        vendors = ["v1", "v2", "v3", "v4"]
        total_items = 0
        for vid in vendors:
            count = db.query(VendorMenuItem).filter(VendorMenuItem.vendor_id == vid).count()
            assert count >= 8, f"Vendor {vid} has {count} items, expected >= 8"
            total_items += count
            print(f"Vendor {vid} item count: {count}")
        assert total_items >= 32
        print(f"Total Menu items across 4 vendors: {total_items}")
    finally:
        db.close()

def test_login_and_auth_flow():
    # Test Coordinator Login
    r = client.post("/api/v1/auth/login", json={"email": "coord.diploma@aharsetu.edu.in", "password": "Coord@123", "role": "coordinator", "department_id": "diploma"})
    assert r.status_code == 200, f"Coordinator login failed: {r.text}"
    token_data = r.json()
    token = token_data["access_token"]
    assert token is not None

    # Test /auth/me
    headers = {"Authorization": f"Bearer {token}"}
    r = client.get("/api/v1/auth/me", headers=headers)
    assert r.status_code == 200
    me = r.json()
    assert me["email"] == "coord.diploma@aharsetu.edu.in"
    assert me["role"] == "coordinator"
    print(f"Verified auth session for {me['name']} ({me['role']})")

    # Test Admin Login
    r_admin = client.post("/api/v1/auth/login", json={"email": "admin@aharsetu.edu.in", "password": "Admin@123", "role": "admin"})
    assert r_admin.status_code == 200, f"Admin login failed: {r_admin.text}"
    print("Verified Admin login successfully")

    # Test Vendor Login
    r_vendor = client.post("/api/v1/auth/login", json={"email": "vendor1@aharsetu.edu.in", "password": "Vendor@123", "role": "vendor"})
    assert r_vendor.status_code == 200, f"Vendor login failed: {r_vendor.text}"
    print("Verified Vendor login successfully")

def test_vendor_menu_api():
    # Test GET /vendors/v1/menu, /v2/menu, /v3/menu, /v4/menu
    for vid in ["v1", "v2", "v3", "v4"]:
        r = client.get(f"/api/v1/vendors/{vid}/menu")
        assert r.status_code == 200
        menu = r.json()
        assert len(menu) >= 8
        print(f"Vendor {vid} API returned {len(menu)} menu items")

if __name__ == "__main__":
    test_public_endpoints()
    test_vendor_menu_counts()
    test_login_and_auth_flow()
    test_vendor_menu_api()
    print("ALL TESTS PASSED SUCCESSFULLY!")
