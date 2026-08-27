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
        Vendor(id="v1", name="Sharma Canteen", owner_name="Gadhvi Bhai", email="vendor1@aharsetu.edu.in", phone="+91 9911223344", status="open", revenue=0.0),
        Vendor(id="v2", name="Fresh Bites", owner_name="Mitesh Bhai", email="vendor2@aharsetu.edu.in", phone="+91 9922334455", status="open", revenue=0.0),
        Vendor(id="v3", name="Hot Meals", owner_name="Bhargav Bhai", email="vendor3@aharsetu.edu.in", phone="+91 9933445566", status="open", revenue=0.0),
        Vendor(id="v4", name="Quick Snacks", owner_name="P. Mehta", email="vendor4@aharsetu.edu.in", phone="+91 9944556677", status="open", revenue=0.0),
    ]
    for v in vendors:
        db.add(v)
    db.commit()

    # 4. Seed Menu Items
    menu_items = [
        # Sharma Canteen
        VendorMenuItem(id="v1m1", vendor_id="v1", name="Tea (Masala Chai)", price=10.0, unit="per cup", available=True, active=True, category="Beverages", description="Freshly brewed masala tea with ginger, cardamom, and aromatic spices"),
        VendorMenuItem(id="v1m2", vendor_id="v1", name="Samosa (2 pcs)", price=20.0, unit="per plate", available=True, active=True, category="Snacks", description="Crispy golden triangular pastry filled with spicy potato and peas filling"),
        VendorMenuItem(id="v1m3", vendor_id="v1", name="Kachori with Chutney", price=20.0, unit="per piece", available=True, active=True, category="Snacks", description="Flaky deep-fried snack stuffed with spiced lentils and served with tamarind chutney"),
        VendorMenuItem(id="v1m4", vendor_id="v1", name="Filter Coffee", price=20.0, unit="per cup", available=True, active=True, category="Beverages", description="South Indian style hot filter coffee prepared with fresh frothed milk"),
        VendorMenuItem(id="v1m5", vendor_id="v1", name="Bread Pakoda", price=25.0, unit="per piece", available=True, active=True, category="Snacks", description="Spiced potato sandwich battered in seasoned besan and deep fried to perfection"),
        VendorMenuItem(id="v1m6", vendor_id="v1", name="Bun Maska", price=25.0, unit="per plate", available=True, active=True, category="Snacks", description="Soft warm bun slathered with rich salted butter, perfect with hot chai"),
        VendorMenuItem(id="v1m7", vendor_id="v1", name="Poha Jalebi Combo", price=45.0, unit="per plate", available=True, active=True, category="Breakfast", description="Indori style spiced flattened rice served with two crispy hot jalebis"),
        VendorMenuItem(id="v1m8", vendor_id="v1", name="Mineral Water (1L)", price=20.0, unit="per bottle", available=True, active=True, category="Beverages", description="Chilled packaged drinking water bottle"),
        
        # Fresh Bites
        VendorMenuItem(id="v2m1", vendor_id="v2", name="Executive Veg Thali", price=90.0, unit="per plate", available=True, active=True, category="Meals", description="Complete meal with 4 phulkas, paneer sabzi, seasonal veg, dal tadka, jeera rice, salad & gulab jamun"),
        VendorMenuItem(id="v2m2", vendor_id="v2", name="Idli Sambhar (2 pcs)", price=40.0, unit="per plate", available=True, active=True, category="Breakfast", description="Steamed soft rice cakes served with hot vegetable sambhar and coconut chutney"),
        VendorMenuItem(id="v2m3", vendor_id="v2", name="Masala Dosa", price=60.0, unit="per plate", available=True, active=True, category="Breakfast", description="Crispy golden fermented crepe stuffed with spiced potato mash, served with sambhar and chutneys"),
        VendorMenuItem(id="v2m4", vendor_id="v2", name="Medu Vada (2 pcs)", price=45.0, unit="per plate", available=True, active=True, category="Breakfast", description="Crispy golden lentil fritters served piping hot with sambhar and chutney"),
        VendorMenuItem(id="v2m5", vendor_id="v2", name="Fresh Fruit Bowl", price=50.0, unit="per bowl", available=True, active=True, category="Snacks", description="Assortment of freshly cut seasonal fruits with chaat masala"),
        VendorMenuItem(id="v2m6", vendor_id="v2", name="Special Sweet Lassi", price=35.0, unit="per glass", available=True, active=True, category="Beverages", description="Thick churned creamy yogurt drink garnished with pistachios and cardamom"),
        VendorMenuItem(id="v2m7", vendor_id="v2", name="Fresh Lime Soda", price=25.0, unit="per glass", available=True, active=True, category="Beverages", description="Refreshing fizzy beverage with freshly squeezed lemon juice and mint"),
        VendorMenuItem(id="v2m8", vendor_id="v2", name="Veg Hakka Noodles", price=70.0, unit="per plate", available=True, active=True, category="Chinese", description="Wok-tossed noodles with shredded cabbage, carrots, bell peppers and soy sauce"),
        
        # Hot Meals
        VendorMenuItem(id="v3m1", vendor_id="v3", name="Deluxe North Indian Thali", price=110.0, unit="per plate", available=True, active=True, category="Meals", description="Paneer butter masala, dal makhani, 4 butter rotis, peas pulao, raita, papad & sweet"),
        VendorMenuItem(id="v3m2", vendor_id="v3", name="Authentic Dal Baati Churma", price=130.0, unit="per serving", available=True, active=True, category="Meals", description="Traditional baked wheat dough balls dipped in pure desi ghee, served with panchmel dal & sweet churma"),
        VendorMenuItem(id="v3m3", vendor_id="v3", name="Rajma Chawal Combo", price=75.0, unit="per plate", available=True, active=True, category="Meals", description="Slow-cooked Kashmiri red kidney beans curry served with aromatic basmati rice and onion salad"),
        VendorMenuItem(id="v3m4", vendor_id="v3", name="Chole Bhature (2 pcs)", price=80.0, unit="per plate", available=True, active=True, category="Meals", description="Spiced Punjabi chickpea curry served with two fluffy deep-fried bhaturas and pickle"),
        VendorMenuItem(id="v3m5", vendor_id="v3", name="Veg Biryani with Raita", price=85.0, unit="per plate", available=True, active=True, category="Meals", description="Fragrant long-grain basmati rice cooked with fresh garden vegetables and whole spices"),
        VendorMenuItem(id="v3m6", vendor_id="v3", name="Paneer Paratha (2 pcs)", price=70.0, unit="per plate", available=True, active=True, category="Meals", description="Whole wheat flatbread stuffed with spiced cottage cheese, served with curd and butter"),
        VendorMenuItem(id="v3m7", vendor_id="v3", name="Pav Bhaji", price=65.0, unit="per plate", available=True, active=True, category="Snacks", description="Spiced mashed vegetable curry served with two butter-toasted pav buns and lemon wedges"),
        VendorMenuItem(id="v3m8", vendor_id="v3", name="Gulab Jamun (2 pcs)", price=30.0, unit="per plate", available=True, active=True, category="Desserts", description="Soft milk-solid dumplings soaked in warm rose and cardamom scented sugar syrup"),
        
        # Quick Snacks
        VendorMenuItem(id="v4m1", vendor_id="v4", name="Grilled Cheese Veg Sandwich", price=50.0, unit="per piece", available=True, active=True, category="Snacks", description="Double layered sandwich with cucumber, tomato, potato, capsicum and melted cheddar cheese"),
        VendorMenuItem(id="v4m2", vendor_id="v4", name="Veg Burger with Fries", price=65.0, unit="per plate", available=True, active=True, category="Fast Food", description="Crisp vegetable patty in a sesame bun with lettuce, tomatoes and mayonnaise, served with potato fries"),
        VendorMenuItem(id="v4m3", vendor_id="v4", name="Paneer Kathi Roll", price=60.0, unit="per piece", available=True, active=True, category="Snacks", description="Flaky paratha wrap stuffed with marinated tandoori paneer, sliced onions and mint sauce"),
        VendorMenuItem(id="v4m4", vendor_id="v4", name="French Fries (Large)", price=45.0, unit="per serving", available=True, active=True, category="Fast Food", description="Crispy golden salted potato fingers served with tomato ketchup"),
        VendorMenuItem(id="v4m5", vendor_id="v4", name="Cold Coffee with Ice Cream", price=50.0, unit="per glass", available=True, active=True, category="Beverages", description="Rich blended cold coffee topped with a generous scoop of vanilla ice cream"),
        VendorMenuItem(id="v4m6", vendor_id="v4", name="Assorted Soft Drink (Can)", price=35.0, unit="per can", available=True, active=True, category="Beverages", description="Chilled 300ml canned beverage"),
        VendorMenuItem(id="v4m7", vendor_id="v4", name="Masala Maggi", price=35.0, unit="per bowl", available=True, active=True, category="Snacks", description="Classic 2-minute noodles tossed with butter, peas, onions, and special spices"),
        VendorMenuItem(id="v4m8", vendor_id="v4", name="Veg Cheese Pizza (7-inch)", price=99.0, unit="per piece", available=True, active=True, category="Fast Food", description="Fresh thin crust pizza loaded with mozzarella cheese, capsicum, corn and onions"),
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
        User(name="Vin Sir", email="admin@aharsetu.edu.in", password_hash=pw, role="admin", preferred_language="en"),
        # DCR
        User(name="Neha Mam", email="dcr@aharsetu.edu.in", password_hash=dcr_pw, role="dcr", preferred_language="en"),
        
        # Principals
        User(name="Pranav Sir", email="principal.dd@aharsetu.edu.in", password_hash=p_pw, role="principal", preferred_language="en"),
        User(name="Sachin Sir", email="principal.pharma@aharsetu.edu.in", password_hash=p_pw, role="principal", preferred_language="hi"),
        User(name="Dr. Sarita Rao", email="principal.nursing@aharsetu.edu.in", password_hash=p_pw, role="principal", preferred_language="en"),
        User(name="Dr. J. P. Vyas", email="principal.physio@aharsetu.edu.in", password_hash=p_pw, role="principal", preferred_language="gu"),
        User(name="Dr. B. K. Bansal", email="principal.bsc@aharsetu.edu.in", password_hash=p_pw, role="principal", preferred_language="en"),
        
        # Coordinators
        User(name="Nandini Mam", email="coord.diploma@aharsetu.edu.in", password_hash=c_pw, role="coordinator", department_id="diploma", preferred_language="en"),
        User(name="Piyush Sir", email="coord.degree@aharsetu.edu.in", password_hash=c_pw, role="coordinator", department_id="degree", preferred_language="en"),
        User(name="Anita Desai", email="coord.pharmacy@aharsetu.edu.in", password_hash=c_pw, role="coordinator", department_id="pharmacy", preferred_language="en"),
        User(name="Kavita Patel", email="coord.nursing@aharsetu.edu.in", password_hash=c_pw, role="coordinator", department_id="nursing", preferred_language="gu"),
        User(name="Sanjay Shah", email="coord.physio@aharsetu.edu.in", password_hash=c_pw, role="coordinator", department_id="physiotherapy", preferred_language="gu"),
        User(name="Amit Verma", email="coord.bsc@aharsetu.edu.in", password_hash=c_pw, role="coordinator", department_id="bsc", preferred_language="en"),
        
        # Vendors
        User(name="Gadhvi Bhai", email="vendor1@aharsetu.edu.in", password_hash=v_pw, role="vendor", vendor_id="v1", preferred_language="en"),
        User(name="Mitesh Bhai", email="vendor2@aharsetu.edu.in", password_hash=v_pw, role="vendor", vendor_id="v2", preferred_language="en"),
        User(name="Bhargav Bhai", email="vendor3@aharsetu.edu.in", password_hash=v_pw, role="vendor", vendor_id="v3", preferred_language="hi"),
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
