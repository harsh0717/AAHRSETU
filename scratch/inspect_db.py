import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.database import SessionLocal
from backend.models.order import MasterOrder, VendorOrder, ApprovalHistory
from backend.models.bill import Bill

def inspect_db():
    db = SessionLocal()
    try:
        print("=" * 60)
        print(" DATABASE ORDERS & BILLS STATUS REPORT")
        print("=" * 60)
        
        # 1. Check all orders
        orders = db.query(MasterOrder).order_by(MasterOrder.created_at.desc()).all()
        print(f"Total Master Orders: {len(orders)}")
        for o in orders:
            print(f"- ID: {o.id} | Title: {o.title} | Status: {o.status} | Billing: {o.billing_status} | Total Amount: ₹{o.total_bill_amount}")
            
            # Print vendor orders
            for vo in o.vendor_orders:
                print(f"   * Sub-Order: {vo.id} | Vendor ID: {vo.vendor_id} | Status: {vo.status} | Amount: ₹{vo.bill_amount}")
                
            # Print history if billing failed
            if o.billing_status == "FAILED" or o.status == "Vendor Processing":
                print("   * History timeline:")
                for h in o.history:
                    print(f"     [{h.timestamp}] {h.action} ({h.role}): {h.remarks}")
        
        # 2. Check all bills
        bills = db.query(Bill).order_by(Bill.generated_at.desc()).all()
        print(f"\nTotal Bills generated in DB: {len(bills)}")
        for b in bills:
            print(f"- Bill ID: {b.id} | Invoice No: {b.invoice_number} | Order ID: {b.order_id} | Vendor: {b.vendor_id} | Amount: ₹{b.amount} | Status: {b.status}")
            
        print("=" * 60)
    finally:
        db.close()

if __name__ == "__main__":
    inspect_db()
