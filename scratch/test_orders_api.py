import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.core.database import Base
from backend.models.user import User
from backend.api.v1.endpoints.orders import read_orders

db_file = "/Users/shubh/Desktop/Ahar-Setu/aharsetu_test.db"
engine = create_engine(f"sqlite:///{db_file}")
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Find Dr. Arvind Mehta
user = db.query(User).filter(User.email == "principal.dd@aharsetu.edu.in").first()
print(f"Logged in user: {user.name} (Role: {user.role}, ID: {user.id})")
print(f"Managed departments: {[d.id for d in user.managed_departments]}")

# Call read_orders
res = read_orders(db=db, current_user=user)
print("\n--- API Response for read_orders ---")
import json
for o in res:
    print(f"ID: {o.id}, Title: {o.title}, Dept: {o.department_id}, Status: {o.status}")

db.close()
