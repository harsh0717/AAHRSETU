from datetime import datetime, timezone
import uuid
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.models.order import MasterOrder, VendorOrder, ApprovalHistory
from backend.models.bill import Bill
from backend.repositories.order import OrderRepository
from backend.repositories.vendor import VendorRepository
from backend.lib.pdf_generator import generate_invoice_pdf

class BillingService:
    def __init__(self, db: Session):
        self.db = db
        self.order_repo = OrderRepository(db)
        self.vendor_repo = VendorRepository(db)

    async def set_vendor_prices(
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
                    
        # 5. If all confirmed, automatically generate PDFs, create Bills, and transition to Completed
        if all_confirmed:
            try:
                # Prepare data for PDFs
                date_str = now.strftime("%Y-%m-%d %H:%M:%S")
                dept_name = master.department.name if master.department else "General"
                coord_name = master.created_by.name if master.created_by else "System Coordinator"
                
                # Gather approval history timeline
                approvals = []
                for h in master.history:
                    approvals.append({
                        "role": h.role.upper(),
                        "user": h.user.name if h.user else "System",
                        "timestamp": h.timestamp.strftime("%Y-%m-%d %H:%M:%S")
                    })
                
                # Gather all items for Master PDF
                all_items_data = []
                for sub_vo in master.vendor_orders:
                    v_name = sub_vo.vendor.name if sub_vo.vendor else "Unknown Vendor"
                    for item in sub_vo.items:
                        all_items_data.append({
                            "name": item.name,
                            "quantity": item.quantity,
                            "price": item.price,
                            "subtotal": item.price * item.quantity,
                            "vendor": v_name
                        })
                        
                # A. Generate Master Invoice PDF
                master_inv_no = f"INV-{master.id}-MASTER"
                master_pdf = generate_invoice_pdf(
                    invoice_number=master_inv_no,
                    date_str=date_str,
                    title=master.title,
                    purpose=master.purpose,
                    department=dept_name,
                    coordinator_name=coord_name,
                    order_id=master.id,
                    items=all_items_data,
                    grand_total=master_total,
                    approvals=approvals
                )
                
                # Create Master Bill record
                master_bill = Bill(
                    id=f"bill-{uuid.uuid4().hex[:8]}",
                    invoice_number=master_inv_no,
                    order_id=master.id,
                    vendor_id=None,
                    department_id=master.department_id,
                    amount=master_total,
                    generated_at=now,
                    status="PAID",
                    pdf_data=master_pdf,
                    system_generated=True
                )
                self.db.add(master_bill)
                
                # B. Generate Vendor Split Invoices
                for sub_vo in master.vendor_orders:
                    sub_items_data = []
                    for item in sub_vo.items:
                        sub_items_data.append({
                            "name": item.name,
                            "quantity": item.quantity,
                            "price": item.price,
                            "subtotal": item.price * item.quantity,
                            "vendor": sub_vo.vendor.name if sub_vo.vendor else "Unknown"
                        })
                    
                    sub_inv_no = f"INV-{master.id}-{sub_vo.vendor_id.upper()}"
                    sub_pdf = generate_invoice_pdf(
                        invoice_number=sub_inv_no,
                        date_str=date_str,
                        title=master.title,
                        purpose=master.purpose,
                        department=dept_name,
                        coordinator_name=coord_name,
                        order_id=master.id,
                        items=sub_items_data,
                        grand_total=sub_vo.bill_amount,
                        approvals=approvals,
                        vendor_name=sub_vo.vendor.name if sub_vo.vendor else None
                    )
                    
                    sub_bill = Bill(
                        id=f"bill-{uuid.uuid4().hex[:8]}",
                        invoice_number=sub_inv_no,
                        order_id=master.id,
                        vendor_id=sub_vo.vendor_id,
                        department_id=master.department_id,
                        amount=sub_vo.bill_amount,
                        generated_at=now,
                        status="PAID",
                        pdf_data=sub_pdf,
                        system_generated=True
                    )
                    self.db.add(sub_bill)
                    
                # Update MasterOrder status to Completed
                master.status = "Completed"
                master.billing_status = "SUCCESS"
                master.total_bill_amount = master_total
                master.bill_generated_at = now
                
                # Log auto-completion in audit timeline
                self.order_repo.create_history_entry(
                    ApprovalHistory(
                        master_order_id=master.id,
                        action="Order Completed & Closed",
                        role="system",
                        user_id=vo.master_order.created_by_id,
                        remarks=f"Master Invoice and split Vendor Invoices automatically generated. Total billing: ₹{master_total}."
                    )
                )
                
            except Exception as e:
                # If PDF generation fails: do NOT mark the order completed, set billing_status = FAILED and alert admin
                master.billing_status = "FAILED"
                self.order_repo.create_history_entry(
                    ApprovalHistory(
                        master_order_id=master.id,
                        action="Billing Generation Failed",
                        role="system",
                        user_id=vo.master_order.created_by_id,
                        remarks=f"PDF billing invoice generation failed: {str(e)}"
                    )
                )
                # Notify administrative role
                try:
                    from backend.services.notification import NotificationService
                    notif_service = NotificationService(self.db)
                    await notif_service.create_and_send_notification(
                        msg_key="administrative",
                        params={"message": f"Billing PDF Generation failed for order {master.id}: {str(e)}"},
                        msg_type="administrative",
                        recipient_role="admin",
                        order_id=master.id
                    )
                except Exception as ne:
                    print(f"[BILLING SERVICE ERROR] Failed to send admin notice: {ne}")
                    
        else:
            self.order_repo.create_history_entry(
                ApprovalHistory(
                    master_order_id=master.id,
                    action="Vendor Confirmed Sub-Order",
                    role="vendor",
                    user_id=vo.master_order.created_by_id,
                    remarks=f"{vendor.name} confirmed pricing for sub-order for ₹{total_amount}"
                )
            )
            
        self.db.commit()
        self.db.refresh(vo)
        return vo

    def complete_order(self, master_order_id: str, user_id: int) -> Optional[MasterOrder]:
        master = self.order_repo.get_by_id(master_order_id)
        if not master:
            return None
            
        master.status = "Completed"
        master.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        
        self.order_repo.create_history_entry(
            ApprovalHistory(
                master_order_id=master.id,
                action="Order Completed",
                role="admin",
                user_id=user_id,
                remarks="Order marked as completed and closed"
            )
        )
        
        return master
