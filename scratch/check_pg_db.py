import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add workspace to path
sys.path.insert(0, "/Users/shubh/Desktop/Ahar-Setu")

db_url = "postgresql://shubh:6906@localhost:5433/aharsetu"
if os.path.exists("/Users/shubh/Desktop/Ahar-Setu/.env"):
    with open("/Users/shubh/Desktop/Ahar-Setu/.env") as f:
        for line in f:
            if line.startswith("DATABASE_URL="):
                db_url = line.strip().split("=", 1)[1]

# Try both ports
urls_to_try = [
    db_url,
    db_url.replace(":5433/", ":5432/").replace(":5433", ":5432")
]

connected = False
for url in urls_to_try:
    print(f"Trying connection to: {url}...")
    try:
        engine = create_engine(url, connect_args={"connect_timeout": 3})
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        # Test query
        db.execute(text("SELECT 1"))
        print("SUCCESS!")
        
        print("\n--- USERS ---")
        res = db.execute(text("SELECT id, name, email, role, department_id, active FROM users"))
        for row in res:
            print(row)

        print("\n--- DEPARTMENTS ---")
        res = db.execute(text("SELECT id, name, label FROM departments"))
        for row in res:
            print(row)

        print("\n--- PRINCIPAL DEPARTMENTS (MANAGED) ---")
        res = db.execute(text("SELECT user_id, department_id FROM user_departments"))
        for row in res:
            print(row)

        print("\n--- ORDERS ---")
        res = db.execute(text("SELECT id, title, department_id, created_by_id, status, total_bill_amount FROM master_orders"))
        for row in res:
            print(row)
            
        db.close()
        connected = True
        break
    except Exception as e:
        print(f"Failed: {e}")

if not connected:
    print("Could not connect to database on any port/credential combination!")
