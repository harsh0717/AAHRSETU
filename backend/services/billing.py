from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.models.order import MasterOrder, VendorOrder, ApprovalHistory
from backend.repositories.order import OrderRepository
from backend.repositories.vendor import VendorRepository


class BillingService:
    def __init__(self, db: Session):
        self.db = db
        self.order_repo = OrderRepository(db)
        self.vendor_repo = VendorRepository(db)

    def set_vendor_prices(
        self,
        vendor_order_id: str,
        prices: Dict[str, float],
        user_name: str
    ) -> Optional[VendorOrder]:
        vo = self.order_repo.get_vendor_order(vendor_order_id)
        if not vo or vo.master_order.status not in ["Vendor Processing", "Vendor Clarification Required"]:
            return None
            
        now = datetime.now(timezone.utc)
        
        # 1. Update prices in sub-items
        total_amount = 0.0
        for item in vo.items:
            if item.name in prices:
                item.price = float(prices[item.name])
            total_amount += item.price * item.quantity
            
        # 2. Update VendorOrder bill amount and invoice details
        vo.bill_amount = total_amount
        vo.status = "Vendor Confirmed"
        vo.invoice_number = f"INV-{vo.master_order_id}-{vo.vendor_id.upper()}"
        vo.updated_at = now
        
        # 3. Add to vendor cumulative revenue
        vendor = vo.vendor
        vendor.revenue += total_amount
        self.db.add(vendor)
        
        # 4. Check if all vendor sub-orders in the MasterOrder are confirmed
        master = vo.master_order
        all_confirmed = True
        master_total = 0.0
        for sub_vo in master.vendor_orders:
            if sub_vo.id == vo.id:
                master_total += total_amount
            else:
                master_total += sub_vo.bill_amount
                if sub_vo.status != "Vendor Confirmed":
                    all_confirmed = False
                    
        # 5. If all confirmed, automatically generate Master Invoice and transition status
        if all_confirmed:
            master.status = "Bill Generated"
            master.total_bill_amount = master_total
            master.bill_generated_at = now
            
            # Log auto-generation in audit timeline
            self.order_repo.create_history_entry(
                ApprovalHistory(
                    master_order_id=master.id,
                    action="Bill Generated Automatically",
                    role="system",
                    user_id=vo.master_order.created_by_id, # Link to coordinator for simplicity
                    remarks=f"Master Invoice generated for ₹{master_total}. Invoices created for all {len(master.vendor_orders)} vendors."
                )
            )
        else:
            self.order_repo.create_history_entry(
                ApprovalHistory(
                    master_order_id=master.id,
                    action="Vendor Confirmed Sub-Order",
                    role="vendor",
                    user_id=vo.master_order.created_by_id, # Placeholder
                    remarks=f"{vendor.name} confirmed pricing for sub-order for ₹{total_amount}"
                )
            )
            
        self.db.commit()
        self.db.refresh(vo)
        return vo

    def complete_order(self, master_order_id: str, user_id: int) -> Optional[MasterOrder]:
        master = self.order_repo.get_by_id(master_order_id)
        if not master or master.status != "Bill Generated":
            return None
            
        master.status = "Completed"
        master.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        
        self.order_repo.create_history_entry(
            master_order_id=master.id,
            action="Order Completed",
            role="admin",
            user_id=user_id,
            remarks="Order marked as completed and closed"
        )
        
        return master
