import os
import sys

os.environ["DATABASE_URL"] = "sqlite:///./aharsetu_test_sec.db"

from fastapi.testclient import TestClient
from backend.main import app
from backend.core.database import engine, Base, SessionLocal
from backend.lib.seed_db import seed_all_database
from backend.core.rate_limiter import login_rate_limiter

# Set up clean DB
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
db = SessionLocal()
seed_all_database(db)
db.close()

client = TestClient(app)

def run_tests():
    print("=" * 60)
    print(" RUNNING SECURITY & OPTION A TESTS")
    print("=" * 60)

    # 1. Test Rate Limiter
    login_rate_limiter.failed_attempts.clear()
    login_rate_limiter.blocked_until.clear()

    print("Testing rate limiter...")
    for i in range(5):
        resp = client.post('/api/v1/auth/login', json={
            'email': 'coord.diploma@aharsetu.edu.in',
            'password': 'WrongPassword123',
            'role': 'coordinator',
            'department_id': 'diploma'
        })
        assert resp.status_code == 400

    # 6th attempt should be blocked with 429
    resp = client.post('/api/v1/auth/login', json={
        'email': 'coord.diploma@aharsetu.edu.in',
        'password': 'Coord@123',
        'role': 'coordinator',
        'department_id': 'diploma'
    })
    assert resp.status_code == 429, f"Expected 429, got {resp.status_code}"
    assert 'Too many failed login attempts' in resp.json()['detail']
    print("✓ Rate limiter successfully blocked 6th attempt with HTTP 429")

    # Clear rate limiter for subsequent tests
    login_rate_limiter.failed_attempts.clear()
    login_rate_limiter.blocked_until.clear()

    # 2. Login to get token
    login_res = client.post('/api/v1/auth/login', json={
        'email': 'coord.diploma@aharsetu.edu.in',
        'password': 'Coord@123',
        'role': 'coordinator',
        'department_id': 'diploma'
    })
    assert login_res.status_code == 200
    token = login_res.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    print("✓ Login with valid credentials succeeded")

    # 3. Test wrong current password
    bad_resp = client.post('/api/v1/auth/change-password', json={
        'current_password': 'IncorrectCurrentPassword',
        'new_password': 'NewPassword@2026'
    }, headers=headers)
    assert bad_resp.status_code == 400
    assert 'Current password entered is incorrect' in bad_resp.json()['detail']
    print("✓ Incorrect old password rejected with 400")

    # 4. Test short new password
    short_resp = client.post('/api/v1/auth/change-password', json={
        'current_password': 'Coord@123',
        'new_password': '123'
    }, headers=headers)
    assert short_resp.status_code == 400
    assert 'at least 6 characters' in short_resp.json()['detail']
    print("✓ Short password rejected with 400")

    # 5. Valid password change
    ok_resp = client.post('/api/v1/auth/change-password', json={
        'current_password': 'Coord@123',
        'new_password': 'NewSecurePassword@2026'
    }, headers=headers)
    assert ok_resp.status_code == 200
    assert ok_resp.json()['success'] is True
    print("✓ Password changed successfully")

    # 6. Verify login with new password
    login_new = client.post('/api/v1/auth/login', json={
        'email': 'coord.diploma@aharsetu.edu.in',
        'password': 'NewSecurePassword@2026',
        'role': 'coordinator',
        'department_id': 'diploma'
    })
    assert login_new.status_code == 200
    print("✓ Login with new password succeeded")

    # 7. Verify old password fails
    login_old = client.post('/api/v1/auth/login', json={
        'email': 'coord.diploma@aharsetu.edu.in',
        'password': 'Coord@123',
        'role': 'coordinator',
        'department_id': 'diploma'
    })
    assert login_old.status_code == 400
    print("✓ Old password no longer works")

    print("=" * 60)
    print(" ALL SECURITY TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == '__main__':
    run_tests()
