import sys
import os

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath('.'))

from backend.core.database import SessionLocal
from backend.models.vendor import Vendor, VendorMenuItem

def run():
    db = SessionLocal()
    try:
        # Ensure 4 vendors exist
        vendors_data = [
            {"id": "v1", "name": "Sharma Canteen", "owner_name": "M. Khan", "email": "vendor1@aharsetu.edu.in", "phone": "+91 9911223344", "status": "open", "revenue": 0.0},
            {"id": "v2", "name": "Fresh Bites", "owner_name": "R. Patel", "email": "vendor2@aharsetu.edu.in", "phone": "+91 9922334455", "status": "open", "revenue": 0.0},
            {"id": "v3", "name": "Hot Meals", "owner_name": "S. Shah", "email": "vendor3@aharsetu.edu.in", "phone": "+91 9933445566", "status": "open", "revenue": 0.0},
            {"id": "v4", "name": "Quick Snacks", "owner_name": "P. Mehta", "email": "vendor4@aharsetu.edu.in", "phone": "+91 9944556677", "status": "open", "revenue": 0.0},
        ]
        
        for v in vendors_data:
            existing_v = db.query(Vendor).filter(Vendor.id == v["id"]).first()
            if existing_v:
                existing_v.name = v["name"]
                existing_v.status = v["status"]
            else:
                db.add(Vendor(**v))
        db.commit()

        menu_items = [
            # Sharma Canteen
            {"id": "v1m1", "vendor_id": "v1", "name": "Tea (Masala Chai)", "price": 10.0, "unit": "per cup", "available": True, "active": True, "category": "Beverages", "description": "Freshly brewed masala tea with ginger, cardamom, and aromatic spices"},
            {"id": "v1m2", "vendor_id": "v1", "name": "Samosa (2 pcs)", "price": 20.0, "unit": "per plate", "available": True, "active": True, "category": "Snacks", "description": "Crispy golden triangular pastry filled with spicy potato and peas filling"},
            {"id": "v1m3", "vendor_id": "v1", "name": "Kachori with Chutney", "price": 20.0, "unit": "per piece", "available": True, "active": True, "category": "Snacks", "description": "Flaky deep-fried snack stuffed with spiced lentils and served with tamarind chutney"},
            {"id": "v1m4", "vendor_id": "v1", "name": "Filter Coffee", "price": 20.0, "unit": "per cup", "available": True, "active": True, "category": "Beverages", "description": "South Indian style hot filter coffee prepared with fresh frothed milk"},
            {"id": "v1m5", "vendor_id": "v1", "name": "Bread Pakoda", "price": 25.0, "unit": "per piece", "available": True, "active": True, "category": "Snacks", "description": "Spiced potato sandwich battered in seasoned besan and deep fried to perfection"},
            {"id": "v1m6", "vendor_id": "v1", "name": "Bun Maska", "price": 25.0, "unit": "per plate", "available": True, "active": True, "category": "Snacks", "description": "Soft warm bun slathered with rich salted butter, perfect with hot chai"},
            {"id": "v1m7", "vendor_id": "v1", "name": "Poha Jalebi Combo", "price": 45.0, "unit": "per plate", "available": True, "active": True, "category": "Breakfast", "description": "Indori style spiced flattened rice served with two crispy hot jalebis"},
            {"id": "v1m8", "vendor_id": "v1", "name": "Mineral Water (1L)", "price": 20.0, "unit": "per bottle", "available": True, "active": True, "category": "Beverages", "description": "Chilled packaged drinking water bottle"},
            
            # Fresh Bites
            {"id": "v2m1", "vendor_id": "v2", "name": "Executive Veg Thali", "price": 90.0, "unit": "per plate", "available": True, "active": True, "category": "Meals", "description": "Complete meal with 4 phulkas, paneer sabzi, seasonal veg, dal tadka, jeera rice, salad & gulab jamun"},
            {"id": "v2m2", "vendor_id": "v2", "name": "Idli Sambhar (2 pcs)", "price": 40.0, "unit": "per plate", "available": True, "active": True, "category": "Breakfast", "description": "Steamed soft rice cakes served with hot vegetable sambhar and coconut chutney"},
            {"id": "v2m3", "vendor_id": "v2", "name": "Masala Dosa", "price": 60.0, "unit": "per plate", "available": True, "active": True, "category": "Breakfast", "description": "Crispy golden fermented crepe stuffed with spiced potato mash, served with sambhar and chutneys"},
            {"id": "v2m4", "vendor_id": "v2", "name": "Medu Vada (2 pcs)", "price": 45.0, "unit": "per plate", "available": True, "active": True, "category": "Breakfast", "description": "Crispy golden lentil fritters served piping hot with sambhar and chutney"},
            {"id": "v2m5", "vendor_id": "v2", "name": "Fresh Fruit Bowl", "price": 50.0, "unit": "per bowl", "available": True, "active": True, "category": "Snacks", "description": "Assortment of freshly cut seasonal fruits with chaat masala"},
            {"id": "v2m6", "vendor_id": "v2", "name": "Special Sweet Lassi", "price": 35.0, "unit": "per glass", "available": True, "active": True, "category": "Beverages", "description": "Thick churned creamy yogurt drink garnished with pistachios and cardamom"},
            {"id": "v2m7", "vendor_id": "v2", "name": "Fresh Lime Soda", "price": 25.0, "unit": "per glass", "available": True, "active": True, "category": "Beverages", "description": "Refreshing fizzy beverage with freshly squeezed lemon juice and mint"},
            {"id": "v2m8", "vendor_id": "v2", "name": "Veg Hakka Noodles", "price": 70.0, "unit": "per plate", "available": True, "active": True, "category": "Chinese", "description": "Wok-tossed noodles with shredded cabbage, carrots, bell peppers and soy sauce"},
            
            # Hot Meals
            {"id": "v3m1", "vendor_id": "v3", "name": "Deluxe North Indian Thali", "price": 110.0, "unit": "per plate", "available": True, "active": True, "category": "Meals", "description": "Paneer butter masala, dal makhani, 4 butter rotis, peas pulao, raita, papad & sweet"},
            {"id": "v3m2", "vendor_id": "v3", "name": "Authentic Dal Baati Churma", "price": 130.0, "unit": "per serving", "available": True, "active": True, "category": "Meals", "description": "Traditional baked wheat dough balls dipped in pure desi ghee, served with panchmel dal & sweet churma"},
            {"id": "v3m3", "vendor_id": "v3", "name": "Rajma Chawal Combo", "price": 75.0, "unit": "per plate", "available": True, "active": True, "category": "Meals", "description": "Slow-cooked Kashmiri red kidney beans curry served with aromatic basmati rice and onion salad"},
            {"id": "v3m4", "vendor_id": "v3", "name": "Chole Bhature (2 pcs)", "price": 80.0, "unit": "per plate", "available": True, "active": True, "category": "Meals", "description": "Spiced Punjabi chickpea curry served with two fluffy deep-fried bhaturas and pickle"},
            {"id": "v3m5", "vendor_id": "v3", "name": "Veg Biryani with Raita", "price": 85.0, "unit": "per plate", "available": True, "active": True, "category": "Meals", "description": "Fragrant long-grain basmati rice cooked with fresh garden vegetables and whole spices"},
            {"id": "v3m6", "vendor_id": "v3", "name": "Paneer Paratha (2 pcs)", "price": 70.0, "unit": "per plate", "available": True, "active": True, "category": "Meals", "description": "Whole wheat flatbread stuffed with spiced cottage cheese, served with curd and butter"},
            {"id": "v3m7", "vendor_id": "v3", "name": "Pav Bhaji", "price": 65.0, "unit": "per plate", "available": True, "active": True, "category": "Snacks", "description": "Spiced mashed vegetable curry served with two butter-toasted pav buns and lemon wedges"},
            {"id": "v3m8", "vendor_id": "v3", "name": "Gulab Jamun (2 pcs)", "price": 30.0, "unit": "per plate", "available": True, "active": True, "category": "Desserts", "description": "Soft milk-solid dumplings soaked in warm rose and cardamom scented sugar syrup"},
            
            # Quick Snacks
            {"id": "v4m1", "vendor_id": "v4", "name": "Grilled Cheese Veg Sandwich", "price": 50.0, "unit": "per piece", "available": True, "active": True, "category": "Snacks", "description": "Double layered sandwich with cucumber, tomato, potato, capsicum and melted cheddar cheese"},
            {"id": "v4m2", "vendor_id": "v4", "name": "Veg Burger with Fries", "price": 65.0, "unit": "per plate", "available": True, "active": True, "category": "Fast Food", "description": "Crisp vegetable patty in a sesame bun with lettuce, tomatoes and mayonnaise, served with potato fries"},
            {"id": "v4m3", "vendor_id": "v4", "name": "Paneer Kathi Roll", "price": 60.0, "unit": "per piece", "available": True, "active": True, "category": "Snacks", "description": "Flaky paratha wrap stuffed with marinated tandoori paneer, sliced onions and mint sauce"},
            {"id": "v4m4", "vendor_id": "v4", "name": "French Fries (Large)", "price": 45.0, "unit": "per serving", "available": True, "active": True, "category": "Fast Food", "description": "Crispy golden salted potato fingers served with tomato ketchup"},
            {"id": "v4m5", "vendor_id": "v4", "name": "Cold Coffee with Ice Cream", "price": 50.0, "unit": "per glass", "available": True, "active": True, "category": "Beverages", "description": "Rich blended cold coffee topped with a generous scoop of vanilla ice cream"},
            {"id": "v4m6", "vendor_id": "v4", "name": "Assorted Soft Drink (Can)", "price": 35.0, "unit": "per can", "available": True, "active": True, "category": "Beverages", "description": "Chilled 300ml canned beverage"},
            {"id": "v4m7", "vendor_id": "v4", "name": "Masala Maggi", "price": 35.0, "unit": "per bowl", "available": True, "active": True, "category": "Snacks", "description": "Classic 2-minute noodles tossed with butter, peas, onions, and special spices"},
            {"id": "v4m8", "vendor_id": "v4", "name": "Veg Cheese Pizza (7-inch)", "price": 99.0, "unit": "per piece", "available": True, "active": True, "category": "Fast Food", "description": "Fresh thin crust pizza loaded with mozzarella cheese, capsicum, corn and onions"},
        ]

        for item in menu_items:
            existing = db.query(VendorMenuItem).filter(VendorMenuItem.id == item["id"]).first()
            if existing:
                for k, v in item.items():
                    setattr(existing, k, v)
            else:
                db.add(VendorMenuItem(**item))
        db.commit()

        # Print report
        for vid in ["v1", "v2", "v3", "v4"]:
            count = db.query(VendorMenuItem).filter(VendorMenuItem.vendor_id == vid).count()
            v_obj = db.query(Vendor).filter(Vendor.id == vid).first()
            print(f"Vendor {vid} ({v_obj.name if v_obj else 'Unknown'}): {count} items in DB")
            
    finally:
        db.close()

if __name__ == "__main__":
    run()
