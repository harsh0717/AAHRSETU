import sys
import os
from datetime import datetime, timezone

os.environ["DATABASE_URL"] = "sqlite:///./aharsetu_test.db"

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.database import SessionLocal
from backend.models.order import MasterOrder, VendorOrder, VendorOrderItem, ApprovalHistory
from backend.models.user import User
from backend.services.billing import BillingService

def run_test():
    db = SessionLocal()
    try:
        print("Creating dummy order for vendor confirmation test...")
        # Create a dummy MasterOrder in 'Vendor Processing'
        order_id = "ORD-TEST-99"
        
        # Clean existing
        db.query(VendorOrderItem).filter(VendorOrderItem.vendor_order_id == "VORD-TEST-99").delete()
        db.query(VendorOrder).filter(VendorOrder.id == "VORD-TEST-99").delete()
        db.query(ApprovalHistory).filter(ApprovalHistory.master_order_id == order_id).delete()
        db.query(MasterOrder).filter(MasterOrder.id == order_id).delete()
        db.commit()
        
        coord_user = db.query(User).filter(User.role == "coordinator").first()
        if not coord_user:
            raise Exception("No coordinator user found in database to link test order to.")
            
        master = MasterOrder(
            id=order_id,
            title="Billing Test Order",
            purpose="Testing if BillingService set_vendor_prices successfully runs and completes order",
            department_id=coord_user.department_id or "diploma",
            created_by_id=coord_user.id,
            status="Vendor Processing"
        )
        db.add(master)
        db.commit()
        
        vo = VendorOrder(
            id="VORD-TEST-99",
            master_order_id=order_id,
            vendor_id="v1",
            status="Pending",
            bill_amount=0.0
        )
        db.add(vo)
        db.commit()
        
        item = VendorOrderItem(
            vendor_order_id="VORD-TEST-99",
            name="Samosa",
            quantity=10,
            price=0.0,
            unit="per plate",
            menu_item_id="v1m2"
        )
        db.add(item)
        db.commit()
        
        print("Order setup complete. Invoking BillingService.set_vendor_prices...")
        billing_service = BillingService(db)
        
        # Run pricing
        import asyncio
        loop = asyncio.get_event_loop()
        res = loop.run_until_complete(billing_service.set_vendor_prices(
            vendor_order_id="VORD-TEST-99",
            prices={"Samosa": 15.0},
            user_name="Sharma Canteen"
        ))
        
        print("Result returned from set_vendor_prices:", res)
        # Fetch updated master order
        updated_master = db.query(MasterOrder).filter(MasterOrder.id == order_id).first()
        print(f"Updated Master Status: {updated_master.status}")
        print(f"Updated Master Billing Status: {updated_master.billing_status}")
        print(f"Updated Master Total Bill Amount: ₹{updated_master.total_bill_amount}")
        
        print("\nApproval History entries:")
        for h in updated_master.history:
            print(f"- {h.action}: {h.remarks}")
            
    except Exception as e:
        print(f"✗ Exception in confirm test: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_test()
