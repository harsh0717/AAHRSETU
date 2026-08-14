import os
import sys

os.environ["DATABASE_URL"] = "sqlite:///./aharsetu_test.db"

from fastapi.testclient import TestClient
from backend.main import app
from backend.core.database import engine, Base, SessionLocal
from backend.lib.seed_db import seed_all_database

# Set up clean DB
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
db = SessionLocal()
seed_all_database(db)
db.close()

client = TestClient(app)

def run_onboarding_tests():
    print("=" * 60)
    print(" RUNNING PROFILE ONBOARDING & VALIDATION TESTS")
    print("=" * 60)

    # 1. Login as Coordinator
    login_res = client.post("/api/v1/auth/login", json={
        "role": "coordinator",
        "email": "coord.diploma@aharsetu.edu.in",
        "password": "Coord@123",
        "department_id": "diploma"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    user_id = login_res.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify initial state
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["profile_setup_completed"] is False
    assert me_data["profile_setup_skipped"] is False
    print("✓ Initial profile state is False/False")

    # 2. Test Skip Onboarding
    skip_res = client.put(f"/api/v1/users/{user_id}", headers=headers, json={
        "profile_setup_skipped": True,
        "profile_setup_completed": False
    })
    assert skip_res.status_code == 200, f"Skip failed: {skip_res.text}"
    skip_data = skip_res.json()
    assert skip_data["profile_setup_skipped"] is True
    assert skip_data["profile_setup_completed"] is False
    print("✓ Skip profile setup persisted on backend")

    # Verify via /auth/me
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.json()["profile_setup_skipped"] is True
    assert me_res.json()["profile_setup_completed"] is False
    print("✓ Skip verified via /auth/me")

    # 3. Test Complete Profile (Valid)
    complete_res = client.put(f"/api/v1/users/{user_id}", headers=headers, json={
        "name": "Priya Sharma Updated",
        "mobile_number": "9876543210",
        "profile_setup_completed": True,
        "profile_setup_skipped": False
    })
    assert complete_res.status_code == 200, f"Completion failed: {complete_res.text}"
    complete_data = complete_res.json()
    assert complete_data["name"] == "Priya Sharma Updated"
    assert complete_data["mobile_number"] == "9876543210"
    assert complete_data["profile_setup_completed"] is True
    assert complete_data["profile_setup_skipped"] is False
    print("✓ Profile completion successful with valid 10-digit number")

    # 4. Test Mobile Number Validation (Invalid length - 9 digits)
    invalid_res = client.put(f"/api/v1/users/{user_id}", headers=headers, json={
        "mobile_number": "987654321"
    })
    assert invalid_res.status_code == 422, f"Expected 422, got {invalid_res.status_code}: {invalid_res.text}"
    print("✓ Rejected 9-digit mobile number with 422 Unprocessable Entity")

    # 5. Test Mobile Number Validation (Invalid format - non-digits)
    invalid_res2 = client.put(f"/api/v1/users/{user_id}", headers=headers, json={
        "mobile_number": "98765abc10"
    })
    assert invalid_res2.status_code == 422, f"Expected 422, got {invalid_res2.status_code}: {invalid_res2.text}"
    print("✓ Rejected alphanumeric mobile number with 422 Unprocessable Entity")

    # 6. Test Mobile Number Validation (Accepts formatted/dirty 10-digit string and strips non-digits)
    valid_formatted_res = client.put(f"/api/v1/users/{user_id}", headers=headers, json={
        "mobile_number": "(987) 654-3210"
    })
    assert valid_formatted_res.status_code == 200, f"Expected 200, got {valid_formatted_res.status_code}: {valid_formatted_res.text}"
    assert valid_formatted_res.json()["mobile_number"] == "9876543210"
    print("✓ Cleaned and saved formatted 10-digit mobile number successfully")

    print("=" * 60)
    print(" ALL PROFILE ONBOARDING & VALIDATION TESTS PASSED")
    print("=" * 60)

if __name__ == "__main__":
    run_onboarding_tests()
