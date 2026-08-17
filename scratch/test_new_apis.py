import os
import sys

os.environ["DATABASE_URL"] = "sqlite:///./aharsetu_test.db"

from fastapi.testclient import TestClient
from backend.main import app
from backend.core.database import engine, Base, SessionLocal
from backend.lib.seed_db import seed_all_database

# Create tables & baseline data
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
db = SessionLocal()
seed_all_database(db)
db.close()

client = TestClient(app)

def run_new_api_tests():
    print("=" * 60)
    print(" RUNNING BILLS & VENDOR CRUD ENDPOINT TESTS")
    print("=" * 60)

    # 1. Login as Admin
    login_res = client.post("/api/v1/auth/login", json={
        "role": "admin",
        "email": "admin@aharsetu.edu.in",
        "password": "Admin@123"
    })
    assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
    admin_token = login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("✓ Admin logged in successfully")

    # 2. Create a new vendor via Admin POST
    vendor_payload = {
        "id": "v5_test",
        "name": "Testing Vendor Canteen",
        "owner_name": "Test Manager",
        "email": "vendor.test@aharsetu.edu.in",
        "phone": "9999888877",
        "password": "Vendor@123",
        "image_url": "http://example.com/test_vendor.png"
    }
    create_res = client.post("/api/v1/vendors", headers=admin_headers, json=vendor_payload)
    assert create_res.status_code == 200, f"Vendor creation failed: {create_res.text}"
    vendor_data = create_res.json()
    assert vendor_data["id"] == "v5_test"
    assert vendor_data["name"] == "Testing Vendor Canteen"
    print("✓ Admin successfully created a new vendor and login user profile")

    # 3. Test new vendor login
    v_login_res = client.post("/api/v1/auth/login", json={
        "role": "vendor",
        "email": "vendor.test@aharsetu.edu.in",
        "password": "Vendor@123"
    })
    assert v_login_res.status_code == 200, f"New vendor login failed: {v_login_res.text}"
    v_token = v_login_res.json()["access_token"]
    v_headers = {"Authorization": f"Bearer {v_token}"}
    print("✓ Newly created vendor logged in successfully")

    # 4. Deactivate the vendor via Admin toggle-active
    toggle_res = client.put("/api/v1/vendors/v5_test/toggle-active", headers=admin_headers)
    assert toggle_res.status_code == 200, f"Toggle active failed: {toggle_res.text}"
    assert toggle_res.json()["active"] is False
    print("✓ Admin successfully deactivated the vendor")

    # 5. Verify deactivated vendor login is blocked
    v_login_fail = client.post("/api/v1/auth/login", json={
        "role": "vendor",
        "email": "vendor.test@aharsetu.edu.in",
        "password": "Vendor@123"
    })
    assert v_login_fail.status_code == 400 or v_login_fail.status_code == 403, f"Expected login fail, got: {v_login_fail.status_code}"
    print("✓ Blocked login for deactivated vendor")

    # 6. Fetch bills list
    bills_res = client.get("/api/v1/bills", headers=admin_headers)
    assert bills_res.status_code == 200, f"Bills retrieval failed: {bills_res.text}"
    print(f"✓ Retrieved {len(bills_res.json())} bills for Admin")

    print("=" * 60)
    print(" ALL NEW BILLS & VENDORS CRUD TESTS PASSED")
    print("=" * 60)

if __name__ == "__main__":
    run_new_api_tests()
