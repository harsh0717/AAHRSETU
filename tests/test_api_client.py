import os
import sys
from fastapi.testclient import TestClient

# Add workspace to path
sys.path.insert(0, "/Users/shubh/Desktop/Ahar-Setu")

from backend.main import app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

db_file = "/Users/shubh/Desktop/Ahar-Setu/aharsetu_test.db"
# Use timeout to prevent hanging if db is locked
engine = create_engine(f"sqlite:///{db_file}", connect_args={"timeout": 5})
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

client = TestClient(app)

# Login as Dr. Arvind Mehta
payload = {
    "email": "principal.dd@aharsetu.edu.in",
    "password": "Principal@123",
    "role": "principal",
    "department_id": "diploma"
}
response = client.post("/api/v1/auth/login", json=payload)
print("--- Login Response ---")
print(response.status_code)
data = response.json()
print(data.keys())
if "user" in data:
    print("User profile:", data["user"])

# Fetch profile using the token
if "access_token" in data:
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    print("\n--- Get Me Response ---")
    print(me_resp.status_code)
    print(me_resp.json())
    
    # Fetch orders using the token
    orders_resp = client.get("/api/v1/orders", headers=headers)
    print("\n--- Get Orders Response ---")
    print(orders_resp.status_code)
    orders = orders_resp.json()
    print("Orders count:", len(orders))
    for o in orders:
        print(f"Order ID: {o['id']}, Title: {o['title']}, Dept: {o['department_id']}, Status: {o['status']}")
else:
    print("No access token returned!")

db.close()
