import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

db_file = "/Users/shubh/Desktop/Ahar-Setu/aharsetu_test.db"
engine = create_engine(f"sqlite:///{db_file}")
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

print("--- USERS ---")
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
