import random
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.models.order import MasterOrder, VendorOrder, VendorOrderItem, VendorOrderModification, ApprovalHistory
from backend.models.user import User
from backend.models.vendor import VendorMenuItem
from backend.repositories.order import OrderRepository
from backend.repositories.vendor import VendorRepository
from backend.repositories.user import UserRepository


class OrderService:
    def __init__(self, db: Session):
        self.db = db
        self.order_repo = OrderRepository(db)
        self.vendor_repo = VendorRepository(db)
        self.user_repo = UserRepository(db)

    def create_order(
        self,
        creator: User,
        title: str,
        purpose: str,
        items_in: List[Dict[str, Any]]
    ) -> MasterOrder:
        now = datetime.now(timezone.utc)
        order_id = f"ORD-{int(now.timestamp()) % 1000000:06d}"
        
        # Resolve department info
        dept_id = creator.department_id
        dept = self.user_repo.get_department_by_id(dept_id) if dept_id else None
        dept_label = dept.label if dept else "Unknown Department"
        
        # Group items by vendor using direct VendorMenuItem lookup
        by_vendor: Dict[str, Dict] = {}
        for item in items_in:
            menu_item_id = item["menu_item_id"]
            quantity = item["quantity"]

            # Direct query — VendorMenuItem has a vendor back-reference
            db_menu_item = self.db.query(VendorMenuItem).filter(
                VendorMenuItem.id == menu_item_id
            ).first()

            if not db_menu_item:
                raise ValueError(f"Menu item '{menu_item_id}' not found in the database")
            if not db_menu_item.vendor:
                raise ValueError(f"Menu item '{menu_item_id}' is not linked to any vendor")

            vendor = db_menu_item.vendor
            if vendor.id not in by_vendor:
                by_vendor[vendor.id] = {"vendor": vendor, "items": []}
            by_vendor[vendor.id]["items"].append({
                "name": db_menu_item.name,
                "quantity": quantity,
                "price": db_menu_item.price,
                "unit": db_menu_item.unit,
                "menu_item_id": db_menu_item.id
            })
            
        master_order = MasterOrder(
            id=order_id,
            title=title,
            purpose=purpose,
            department_id=dept_id,
            created_by_id=creator.id,
            status="Created"
        )
        self.order_repo.create(master_order)
        
        # Create sub-orders
        for i, (vendor_id, data) in enumerate(by_vendor.items()):
            vendor = data["vendor"]
            vo_id = f"VORD-{int(now.timestamp()) % 100000:05d}-{i + 1}"
            
            vendor_order = VendorOrder(
                id=vo_id,
                master_order_id=order_id,
                vendor_id=vendor.id,
                status="Pending",
                bill_amount=0.0
            )
            self.order_repo.create_vendor_order(vendor_order)
            
            # Create sub-items
            for item in data["items"]:
                vo_item = VendorOrderItem(
                    vendor_order_id=vo_id,
                    name=item["name"],
                    quantity=item["quantity"],
                    price=item["price"],
                    unit=item["unit"],
                    menu_item_id=item["menu_item_id"]
                )
                self.order_repo.create_order_item(vo_item)
                
        # Log approval history
        history = ApprovalHistory(
            master_order_id=order_id,
            action="Order Created",
            role=creator.role,
            user_id=creator.id,
            remarks=f"Created order with {len(items_in)} items from {len(by_vendor)} vendors"
        )
        self.order_repo.create_history_entry(history)
        
        return master_order

    def submit_for_approval(self, order_id: str, user: User) -> Optional[MasterOrder]:
        order = self.order_repo.get_by_id(order_id)
        if not order or order.status != "Created":
            return None
            
        order.status = "Sent for Approval"
        order.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        
        self.order_repo.create_history_entry(ApprovalHistory(
            master_order_id=order_id,
            action="Submitted for Approval",
            role=user.role,
            user_id=user.id,
            remarks="Sent to Principal for review"
        ))
        
        return order

    def principal_review(self, order_id: str, action: str, remarks: str, user: User) -> Optional[MasterOrder]:
        order = self.order_repo.get_by_id(order_id)
        if not order or order.status not in ["Sent for Approval", "Principal Reviewing"]:
            return None
            
        now = datetime.now(timezone.utc)
        if action == "approve":
            order.status = "Principal Approved"
        else:
            order.status = "Principal Rejected"
            
        order.updated_at = now
        self.db.commit()
        
        # Save approval logs as relationship on MasterOrder
        history = ApprovalHistory(
            master_order_id=order_id,
            action="Principal Approved" if action == "approve" else "Principal Rejected",
            role=user.role,
            user_id=user.id,
            remarks=remarks
        )
        self.order_repo.create_history_entry(history)
        
        return order

    def dcr_review(self, order_id: str, action: str, remarks: str, user: User) -> Optional[MasterOrder]:
        order = self.order_repo.get_by_id(order_id)
        if not order or order.status not in ["Principal Approved", "DCR Reviewing"]:
            return None
            
        now = datetime.now(timezone.utc)
        if action == "approve":
            # DCR approval automatically pushes the order to "Vendor Processing"
            order.status = "Vendor Processing"
            # Set each suborder to "Pending" (or "Vendor Processing") to trigger pricing
            for vo in order.vendor_orders:
                vo.status = "Pending"
        else:
            order.status = "DCR Rejected"
            
        order.updated_at = now
        self.db.commit()
        
        history = ApprovalHistory(
            master_order_id=order_id,
            action="DCR Approved & Forwarded" if action == "approve" else "DCR Rejected",
            role=user.role,
            user_id=user.id,
            remarks=remarks
        )
        self.order_repo.create_history_entry(history)
        
        return order

    def request_vendor_modification(
        self,
        vendor_order_id: str,
        reason: str,
        mod_type: str,
        user: User
    ) -> Optional[VendorOrder]:
        vo = self.order_repo.get_vendor_order(vendor_order_id)
        if not vo or vo.master_order.status != "Vendor Processing":
            return None
            
        now = datetime.now(timezone.utc)
        
        # Check if modification already exists, update or create
        if vo.modification:
            vo.modification.reason = reason
            vo.modification.type = mod_type
            vo.modification.requested_at = now
            vo.modification.status = "Pending"
        else:
            mod = VendorOrderModification(
                vendor_order_id=vo.id,
                reason=reason,
                type=mod_type,
                requested_at=now,
                status="Pending"
            )
            self.order_repo.create_modification(mod)
            
        vo.master_order.status = "Vendor Clarification Required"
        vo.master_order.updated_at = now
        self.db.commit()
        
        # Log history
        history = ApprovalHistory(
            master_order_id=vo.master_order_id,
            action="Vendor Clarification Requested",
            role="vendor",
            user_id=user.id,
            remarks=f"{vo.vendor.name} requested {mod_type} changes. Reason: {reason}"
        )
        self.order_repo.create_history_entry(history)
        
        return vo

    def resolve_modification(
        self,
        vendor_order_id: str,
        resolution: str, # accept, reject
        user: User
    ) -> Optional[MasterOrder]:
        vo = self.order_repo.get_vendor_order(vendor_order_id)
        if not vo or not vo.modification or vo.modification.status != "Pending":
            return None
            
        now = datetime.now(timezone.utc)
        master = vo.master_order
        
        if resolution == "accept":
            vo.modification.status = "Accepted"
            mod_type = vo.modification.type
            
            # Workflow Logic
            if mod_type == "minor":
                # Returns to vendor processing directly
                master.status = "Vendor Processing"
            else:
                # Major changes return to Sent for Approval for Principal re-approval
                master.status = "Sent for Approval"
                master.principal_approval_status = None # Reset
                
            history = ApprovalHistory(
                master_order_id=master.id,
                action="Modification Accepted",
                role=user.role,
                user_id=user.id,
                remarks=f"Accepted modification for {vo.vendor.name}. Order status set to: {master.status}"
            )
        else:
            vo.modification.status = "Rejected"
            master.status = "Vendor Processing" # Resume vendor processing
            
            history = ApprovalHistory(
                master_order_id=master.id,
                action="Modification Rejected",
                role=user.role,
                user_id=user.id,
                remarks=f"Rejected modification for {vo.vendor.name}. Vendor must fulfill original order"
            )
            
        self.order_repo.create_history_entry(history)
        master.updated_at = now
        self.db.commit()
        
        return master
