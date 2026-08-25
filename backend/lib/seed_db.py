from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from backend.core.security import get_password_hash
from backend.models import (
    User, Department, Vendor, VendorMenuItem, MasterOrder,
    VendorOrder, VendorOrderItem, VendorOrderModification, ApprovalHistory, Notification, AuditLog, UserSession,
    Bill, Settlement, Payment
)


def seed_all_database(db: Session):
    """
    Clear all database tables and seed them with the structured AharSetu v2.0 demo data.
    """
    # 1. Clear existing tables in dependency order
    db.query(AuditLog).delete()
    db.query(UserSession).delete()
    db.query(Notification).delete()
    db.query(Payment).delete()
    db.query(Bill).delete()
    db.query(Settlement).delete()
    db.query(VendorOrderItem).delete()
    db.query(VendorOrderModification).delete()
    db.query(VendorOrder).delete()
    db.query(ApprovalHistory).delete()
    db.query(MasterOrder).delete()
    db.query(VendorMenuItem).delete()
    db.query(User).delete()
    db.query(Vendor).delete()
    db.query(Department).delete()
    db.commit()

    # 2. Seed Departments
    depts = [
        Department(id="diploma", name="Diploma", label="Diploma Department"),
        Department(id="degree", name="Degree", label="Degree Department"),
        Department(id="pharmacy", name="Pharmacy", label="Pharmacy Department"),
        Department(id="physiotherapy", name="Physiotherapy", label="Physiotherapy Department"),
        Department(id="nursing", name="Nursing", label="Nursing Department"),
        Department(id="bsc", name="B.Sc./Paramedical", label="B.Sc./Paramedical Department"),
    ]
    for d in depts:
        db.add(d)
    db.commit()

    # 3. Seed Vendors
    vendors = [
        Vendor(id="v1", name="Sharma Canteen", owner_name="M. Khan", email="vendor1@aharsetu.edu.in", phone="+91 9911223344", status="open", revenue=0.0),
        Vendor(id="v2", name="Fresh Bites", owner_name="R. Patel", email="vendor2@aharsetu.edu.in", phone="+91 9922334455", status="open", revenue=0.0),
        Vendor(id="v3", name="Hot Meals", owner_name="S. Shah", email="vendor3@aharsetu.edu.in", phone="+91 9933445566", status="closed", revenue=0.0),
        Vendor(id="v4", name="Quick Snacks", owner_name="P. Mehta", email="vendor4@aharsetu.edu.in", phone="+91 9944556677", status="temporarily_unavailable", revenue=0.0),
    ]
    for v in vendors:
        db.add(v)
    db.commit()

    # 4. Seed Menu Items
    menu_items = [
        # Sharma Canteen
        VendorMenuItem(id="v1m1", vendor_id="v1", name="Tea",      price=10.0,  unit="per cup",   available=True, active=True, category="Beverages", description="Freshly brewed masala tea with local spices"),
        VendorMenuItem(id="v1m2", vendor_id="v1", name="Samosa",   price=15.0,  unit="per piece", available=True, active=True, category="Snacks", description="Crispy triangular pastry stuffed with spiced potatoes"),
        VendorMenuItem(id="v1m3", vendor_id="v1", name="Kachori",  price=18.0,  unit="per piece", available=True, active=True, category="Snacks", description="Flaky deep-fried snack with lentils and local spices"),
        VendorMenuItem(id="v1m4", vendor_id="v1", name="Coffee",   price=15.0,  unit="per cup",   available=True, active=True, category="Beverages", description="Hot filter coffee prepared with fresh milk"),
        VendorMenuItem(id="v1m5", vendor_id="v1", name="Cold Water Bottle", price=20.0, unit="per bottle", available=True, active=True, category="Beverages", description="Chilled mineral water 1L"),
        # Fresh Bites
        VendorMenuItem(id="v2m1", vendor_id="v2", name="Veg Lunch",    price=80.0,  unit="per plate",   available=True, active=True, category="Meals", description="Standard north Indian meal with roti, sabzi, dal and rice"),
        VendorMenuItem(id="v2m2", vendor_id="v2", name="Idli Sambhar", price=40.0,  unit="per plate",   available=True, active=True, category="Breakfast", description="Soft steamed rice cakes served with sambhar and coconut chutney"),
        VendorMenuItem(id="v2m3", vendor_id="v2", name="Poha",         price=25.0,  unit="per plate",   available=True, active=True, category="Breakfast", description="Flattened rice cooked with onions, turmeric and peanuts"),
        VendorMenuItem(id="v2m4", vendor_id="v2", name="Fruit Bowl",   price=50.0,  unit="per bowl",    available=True, active=True, category="Snacks", description="Fresh seasonal cut fruits"),
        VendorMenuItem(id="v2m5", vendor_id="v2", name="Lassi",        price=30.0,  unit="per glass",   available=True, active=True, category="Beverages", description="Sweetened thick yoghurt drink with cardamom flavour"),
        # Hot Meals
        VendorMenuItem(id="v3m1", vendor_id="v3", name="Thali",     price=100.0, unit="per plate",  available=True, active=True, category="Meals", description="Premium authentic thali with ghee roti, two sabzis, dal, rice, sweet and papad"),
        VendorMenuItem(id="v3m2", vendor_id="v3", name="Dal Baati", price=120.0, unit="per serving", available=True, active=True, category="Meals", description="Traditional Rajasthani dish of baked flour balls in pure ghee, served with panchmel dal"),
        # Quick Snacks
        VendorMenuItem(id="v4m1", vendor_id="v4", name="Sandwich", price=35.0, unit="per piece",  available=True, active=True, category="Snacks", description="Grilled vegetable sandwich with mint chutney"),
        VendorMenuItem(id="v4m2", vendor_id="v4", name="Chips",    price=20.0, unit="per packet", available=True, active=True, category="Snacks", description="Salted crispy potato wafers"),
        VendorMenuItem(id="v4m3", vendor_id="v4", name="Cold Drink", price=25.0, unit="per bottle", available=True, active=True, category="Beverages", description="Assorted carbonated soft drinks 250ml"),
    ]
    for mi in menu_items:
        db.add(mi)
    db.commit()

    # 5. Seed Users with hashed passwords
    pw = get_password_hash("Admin@123")
    dcr_pw = get_password_hash("DCR@123")
    p_pw = get_password_hash("Principal@123")
    c_pw = get_password_hash("Coord@123")
    v_pw = get_password_hash("Vendor@123")

    users = [
        # Admin
        User(name="Rajesh Gupta", email="admin@aharsetu.edu.in", password_hash=pw, role="admin", preferred_language="en"),
        # DCR
        User(name="S. Patil", email="dcr@aharsetu.edu.in", password_hash=dcr_pw, role="dcr", preferred_language="en"),
        
        # Principals
        User(name="Dr. Arvind Mehta", email="principal.dd@aharsetu.edu.in", password_hash=p_pw, role="principal", preferred_language="en"),
        User(name="Dr. Rekha Sharma", email="principal.pharma@aharsetu.edu.in", password_hash=p_pw, role="principal", preferred_language="hi"),
        User(name="Dr. Sarita Rao", email="principal.nursing@aharsetu.edu.in", password_hash=p_pw, role="principal", preferred_language="en"),
        User(name="Dr. J. P. Vyas", email="principal.physio@aharsetu.edu.in", password_hash=p_pw, role="principal", preferred_language="gu"),
        User(name="Dr. B. K. Bansal", email="principal.bsc@aharsetu.edu.in", password_hash=p_pw, role="principal", preferred_language="en"),
        
        # Coordinators
        User(name="Priya Sharma", email="coord.diploma@aharsetu.edu.in", password_hash=c_pw, role="coordinator", department_id="diploma", preferred_language="en"),
        User(name="Ravi Kumar", email="coord.degree@aharsetu.edu.in", password_hash=c_pw, role="coordinator", department_id="degree", preferred_language="en"),
        User(name="Anita Desai", email="coord.pharmacy@aharsetu.edu.in", password_hash=c_pw, role="coordinator", department_id="pharmacy", preferred_language="en"),
        User(name="Kavita Patel", email="coord.nursing@aharsetu.edu.in", password_hash=c_pw, role="coordinator", department_id="nursing", preferred_language="gu"),
        User(name="Sanjay Shah", email="coord.physio@aharsetu.edu.in", password_hash=c_pw, role="coordinator", department_id="physiotherapy", preferred_language="gu"),
        User(name="Amit Verma", email="coord.bsc@aharsetu.edu.in", password_hash=c_pw, role="coordinator", department_id="bsc", preferred_language="en"),
        
        # Vendors
        User(name="Sharma Canteen Manager", email="vendor1@aharsetu.edu.in", password_hash=v_pw, role="vendor", vendor_id="v1", preferred_language="en"),
        User(name="Fresh Bites Manager", email="vendor2@aharsetu.edu.in", password_hash=v_pw, role="vendor", vendor_id="v2", preferred_language="en"),
        User(name="Hot Meals Manager", email="vendor3@aharsetu.edu.in", password_hash=v_pw, role="vendor", vendor_id="v3", preferred_language="hi"),
        User(name="Quick Snacks Manager", email="vendor4@aharsetu.edu.in", password_hash=v_pw, role="vendor", vendor_id="v4", preferred_language="gu"),
    ]
    
    for u in users:
        db.add(u)
    db.commit()

    # 6. Map Principal managed departments
    principal_dd = db.query(User).filter(User.email == "principal.dd@aharsetu.edu.in").first()
    if principal_dd:
        d1 = db.query(Department).filter(Department.id == "diploma").first()
        d2 = db.query(Department).filter(Department.id == "degree").first()
        if d1: principal_dd.managed_departments.append(d1)
        if d2: principal_dd.managed_departments.append(d2)
        
    principal_pharma = db.query(User).filter(User.email == "principal.pharma@aharsetu.edu.in").first()
    if principal_pharma:
        d = db.query(Department).filter(Department.id == "pharmacy").first()
        if d: principal_pharma.managed_departments.append(d)
        
    principal_nursing = db.query(User).filter(User.email == "principal.nursing@aharsetu.edu.in").first()
    if principal_nursing:
        d = db.query(Department).filter(Department.id == "nursing").first()
        if d: principal_nursing.managed_departments.append(d)

    principal_physio = db.query(User).filter(User.email == "principal.physio@aharsetu.edu.in").first()
    if principal_physio:
        d = db.query(Department).filter(Department.id == "physiotherapy").first()
        if d: principal_physio.managed_departments.append(d)

    principal_bsc = db.query(User).filter(User.email == "principal.bsc@aharsetu.edu.in").first()
    if principal_bsc:
        d = db.query(Department).filter(Department.id == "bsc").first()
        if d: principal_bsc.managed_departments.append(d)

    db.commit()
