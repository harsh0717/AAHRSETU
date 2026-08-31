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
        items_in: List[Dict[str, Any]],
        department_id: Optional[str] = None,
        order_type: str = "IMMEDIATE",
        scheduled_for: Optional[datetime] = None,
        timezone_str: str = "Asia/Kolkata"
    ) -> MasterOrder:
        now = datetime.now(timezone.utc)
        order_id = f"ORD-{int(now.timestamp()) % 1000000:06d}"
        
        # Validate scheduling
        is_scheduled = (order_type or "IMMEDIATE").upper() == "SCHEDULED"
        if is_scheduled:
            if not scheduled_for:
                raise ValueError("Scheduled date and time are required for scheduled orders.")
            # Ensure scheduled_for is timezone-aware for comparison
            sched_dt = scheduled_for if scheduled_for.tzinfo else scheduled_for.replace(tzinfo=timezone.utc)
            if sched_dt <= now:
                raise ValueError("Scheduled order fulfillment time must be in the future.")

        # Resolve department info
        dept_id = department_id or creator.department_id
        dept = self.user_repo.get_department_by_id(dept_id) if dept_id else None
        dept_label = dept.label if dept else "Unknown Department"
        
        # Group items by vendor using direct VendorMenuItem lookup
        by_vendor: Dict[str, Dict] = {}
        for item in items_in:
            menu_item_id = item["menu_item_id"]
            quantity = item["quantity"]
            if quantity <= 0:
                continue

            # Direct query — VendorMenuItem has a vendor back-reference
            db_menu_item = self.db.query(VendorMenuItem).filter(
                VendorMenuItem.id == menu_item_id
            ).first()

            if not db_menu_item and item.get("name"):
                db_menu_item = self.db.query(VendorMenuItem).filter(
                    VendorMenuItem.name == item["name"]
                ).first()

            vendor = None
            if db_menu_item and db_menu_item.vendor:
                vendor = db_menu_item.vendor
                # Availability validation
                if db_menu_item.available is False or db_menu_item.active is False:
                    raise ValueError(f"'{db_menu_item.name}' is currently unavailable.")
                item_name = db_menu_item.name
                item_price = float(db_menu_item.price or 0.0)
                item_unit = db_menu_item.unit
                item_id = db_menu_item.id
            else:
                # Infer vendor from menu_item_id prefix (v1, v2, v3, v4)
                v_id = "v1"
                if str(menu_item_id).startswith("v2"): v_id = "v2"
                elif str(menu_item_id).startswith("v3"): v_id = "v3"
                elif str(menu_item_id).startswith("v4"): v_id = "v4"
                
                from backend.models.vendor import Vendor
                vendor = self.db.query(Vendor).filter(Vendor.id == v_id).first()
                if not vendor:
                    vendor = self.db.query(Vendor).first()
                item_name = item.get("name") or str(menu_item_id)
                item_price = float(item.get("price") or 15.0)
                item_unit = item.get("unit") or "per serving"
                item_id = menu_item_id

            if not vendor:
                raise ValueError(f"Could not resolve canteen vendor for item '{menu_item_id}'")

            if vendor.id not in by_vendor:
                by_vendor[vendor.id] = {"vendor": vendor, "items": []}
            by_vendor[vendor.id]["items"].append({
                "name": item_name,
                "quantity": quantity,
                "price": item_price,
                "unit": item_unit,
                "menu_item_id": item_id
            })

        if not by_vendor:
            raise ValueError("Requisition must contain at least one valid item.")
            
        initial_status = "Principal Approved" if creator.role == "principal" else "Sent for Approval"
        
        master_order = MasterOrder(
            id=order_id,
            title=title,
            purpose=purpose,
            department_id=dept_id,
            created_by_id=creator.id,
            status=initial_status,
            total_bill_amount=0.0,
            order_type="SCHEDULED" if is_scheduled else "IMMEDIATE",
            scheduled_for=scheduled_for if is_scheduled else None,
            timezone=timezone_str or "Asia/Kolkata"
        )
        self.order_repo.create(master_order)
        
        # Create sub-orders with calculated estimated bill amounts
        total_order_amount = 0.0
        for i, (vendor_id, data) in enumerate(by_vendor.items()):
            vendor = data["vendor"]
            vo_id = f"VORD-{int(now.timestamp()) % 100000:05d}-{i + 1}"
            
            subtotal = sum(float(item.get("price") or 15.0) * int(item.get("quantity") or 1) for item in data["items"])
            total_order_amount += subtotal

            vendor_order = VendorOrder(
                id=vo_id,
                master_order_id=order_id,
                vendor_id=vendor.id,
                status="Pending",
                bill_amount=subtotal
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

        master_order.total_bill_amount = total_order_amount
        self.db.commit()
                
        # Log approval history (creation)
        history_created = ApprovalHistory(
            master_order_id=order_id,
            action="Order Created",
            role=creator.role,
            user_id=creator.id,
            remarks=f"Created order with {len(items_in)} items from {len(by_vendor)} vendors"
        )
        self.order_repo.create_history_entry(history_created)

        # Log submission/approval history immediately
        history_submitted = ApprovalHistory(
            master_order_id=order_id,
            action="Principal Approved" if creator.role == "principal" else "Submitted for Approval",
            role=creator.role,
            user_id=creator.id,
            remarks="Directly approved and sent to DCR for budget clearance" if creator.role == "principal" else "Sent to Principal for review"
        )
        self.order_repo.create_history_entry(history_submitted)
        
        return master_order

    def submit_for_approval(self, order_id: str, user: User) -> Optional[MasterOrder]:
        order = self.order_repo.get_by_id(order_id)
        if not order:
            return None
        if order.status in ["Sent for Approval", "Principal Approved"]:
            return order
        if order.status != "Created":
            return None
            
        if user.role == "principal":
            order.status = "Principal Approved"
        else:
            order.status = "Sent for Approval"
            
        order.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        
        self.order_repo.create_history_entry(ApprovalHistory(
            master_order_id=order_id,
            action="Principal Approved" if user.role == "principal" else "Submitted for Approval",
            role=user.role,
            user_id=user.id,
            remarks="Directly approved and sent to DCR for budget clearance" if user.role == "principal" else "Sent to Principal for review"
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

    def update_order(
        self,
        order_id: str,
        title: str,
        purpose: str,
        items_in: List[Dict[str, Any]],
        user: User,
        department_id: Optional[str] = None
    ) -> MasterOrder:
        order = self.order_repo.get_by_id(order_id)
        if not order:
            raise ValueError("Order not found")

        # Allow editing only before DCR approval (e.g. Created, Draft, Sent for Approval, Principal Rejected)
        allowed_statuses = ["Created", "Draft", "Sent for Approval", "Principal Reviewing", "Principal Rejected"]
        if order.status not in allowed_statuses:
            raise ValueError(f"Cannot edit order in status '{order.status}'. Editing is only allowed prior to DCR clearance.")

        # Permission check
        if user.role == "coordinator":
            if order.created_by_id != user.id and order.department_id != user.department_id:
                raise ValueError("You do not have permission to modify this requisition.")
        elif user.role not in ["principal", "admin"]:
            raise ValueError("Unauthorized to edit requisitions.")

        now = datetime.now(timezone.utc)
        order.title = title
        order.purpose = purpose
        if department_id:
            order.department_id = department_id

        # If items are updated, re-split items among vendors
        if items_in and len(items_in) > 0:
            by_vendor: Dict[str, Dict] = {}
            for item in items_in:
                menu_item_id = item["menu_item_id"]
                quantity = item["quantity"]

                db_menu_item = self.db.query(VendorMenuItem).filter(
                    VendorMenuItem.id == menu_item_id
                ).first()

                if not db_menu_item and item.get("name"):
                    db_menu_item = self.db.query(VendorMenuItem).filter(
                        VendorMenuItem.name == item["name"]
                    ).first()

                vendor = None
                if db_menu_item and db_menu_item.vendor:
                    vendor = db_menu_item.vendor
                    item_name = db_menu_item.name
                    item_price = db_menu_item.price
                    item_unit = db_menu_item.unit
                    item_id = db_menu_item.id
                else:
                    v_id = "v1"
                    if str(menu_item_id).startswith("v2"): v_id = "v2"
                    elif str(menu_item_id).startswith("v3"): v_id = "v3"
                    elif str(menu_item_id).startswith("v4"): v_id = "v4"

                    from backend.models.vendor import Vendor
                    vendor = self.db.query(Vendor).filter(Vendor.id == v_id).first()
                    if not vendor:
                        vendor = self.db.query(Vendor).first()
                    item_name = item.get("name") or str(menu_item_id)
                    item_price = item.get("price") or 15.0
                    item_unit = item.get("unit") or "per serving"
                    item_id = menu_item_id

                if not vendor:
                    raise ValueError(f"Could not resolve canteen vendor for item '{menu_item_id}'")

                if vendor.id not in by_vendor:
                    by_vendor[vendor.id] = {"vendor": vendor, "items": []}
                by_vendor[vendor.id]["items"].append({
                    "name": item_name,
                    "quantity": quantity,
                    "price": item_price,
                    "unit": item_unit,
                    "menu_item_id": item_id
                })

            # Clean up old vendor orders and items
            for old_vo in list(order.vendor_orders):
                self.db.delete(old_vo)
            self.db.flush()

            # Create updated sub-orders with calculated estimated amounts
            total_order_amount = 0.0
            for i, (vendor_id, data) in enumerate(by_vendor.items()):
                vendor = data["vendor"]
                vo_id = f"VORD-{int(now.timestamp()) % 100000:05d}-{i + 1}"

                subtotal = sum(float(item.get("price") or 15.0) * int(item.get("quantity") or 1) for item in data["items"])
                total_order_amount += subtotal

                vendor_order = VendorOrder(
                    id=vo_id,
                    master_order_id=order.id,
                    vendor_id=vendor.id,
                    status="Pending",
                    bill_amount=subtotal
                )
                self.db.add(vendor_order)
                self.db.flush()

                for item in data["items"]:
                    vo_item = VendorOrderItem(
                        vendor_order_id=vo_id,
                        name=item["name"],
                        quantity=item["quantity"],
                        price=item["price"],
                        unit=item["unit"],
                        menu_item_id=item["menu_item_id"]
                    )
                    self.db.add(vo_item)

            order.total_bill_amount = total_order_amount

        # Reset status if it was previously rejected
        if order.status == "Principal Rejected":
            order.status = "Sent for Approval"

        order.updated_at = now
        self.db.commit()

        # Log history
        history_edited = ApprovalHistory(
            master_order_id=order.id,
            action="Order Modified by Coordinator",
            role=user.role,
            user_id=user.id,
            remarks=f"Requisition details updated ({len(items_in)} line items)"
        )
        self.order_repo.create_history_entry(history_edited)
        self.db.refresh(order)
        return order

    def cancel_order(
        self,
        order_id: str,
        user: User,
        reason: Optional[str] = None
    ) -> MasterOrder:
        order = self.order_repo.get_by_id(order_id)
        if not order:
            raise ValueError("Order not found")

        # Can cancel anytime prior to DCR final approval (i.e. before Vendor Processing / Completed)
        allowed_statuses = ["Created", "Draft", "Sent for Approval", "Principal Reviewing", "Principal Rejected", "Principal Approved"]
        if order.status not in allowed_statuses:
            raise ValueError(f"Order cannot be cancelled in '{order.status}' status once dispatched to canteen kitchens.")

        if user.role == "coordinator":
            if order.created_by_id != user.id and order.department_id != user.department_id:
                raise ValueError("You do not have permission to cancel this requisition.")
        elif user.role not in ["principal", "dcr", "admin"]:
            raise ValueError("Unauthorized to cancel requisitions.")

        now = datetime.now(timezone.utc)
        order.status = "Cancelled"
        order.updated_at = now

        for vo in order.vendor_orders:
            vo.status = "Cancelled"

        self.db.commit()

        # Log cancellation history
        cancel_remarks = reason or "Cancelled by Coordinator prior to DCR final approval"
        history_cancelled = ApprovalHistory(
            master_order_id=order.id,
            action="Order Cancelled",
            role=user.role,
            user_id=user.id,
            remarks=cancel_remarks
        )
        self.order_repo.create_history_entry(history_cancelled)
        self.db.refresh(order)
        return order
