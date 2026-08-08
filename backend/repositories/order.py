from typing import List, Optional
from sqlalchemy.orm import Session
from backend.models.order import MasterOrder, VendorOrder, VendorOrderItem, VendorOrderModification, ApprovalHistory
from backend.repositories.base import BaseRepository


class OrderRepository(BaseRepository[MasterOrder]):
    def __init__(self, db: Session):
        super().__init__(MasterOrder, db)

    def get_by_id(self, order_id: str) -> Optional[MasterOrder]:
        return self.db.query(MasterOrder).filter(MasterOrder.id == order_id).first()

    def get_by_coordinator(self, coordinator_id: int) -> List[MasterOrder]:
        return self.db.query(MasterOrder).filter(MasterOrder.created_by_id == coordinator_id).all()

    def get_by_departments(self, department_ids: List[str]) -> List[MasterOrder]:
        return self.db.query(MasterOrder).filter(MasterOrder.department_id.in_(department_ids)).all()

    def get_by_vendor(self, vendor_id: str) -> List[MasterOrder]:
        return self.db.query(MasterOrder).join(VendorOrder).filter(VendorOrder.vendor_id == vendor_id).all()

    def get_vendor_order(self, vendor_order_id: str) -> Optional[VendorOrder]:
        return self.db.query(VendorOrder).filter(VendorOrder.id == vendor_order_id).first()

    def get_vendor_orders_for_master(self, master_order_id: str) -> List[VendorOrder]:
        return self.db.query(VendorOrder).filter(VendorOrder.master_order_id == master_order_id).all()

    def create_vendor_order(self, vo: VendorOrder) -> VendorOrder:
        self.db.add(vo)
        self.db.commit()
        self.db.refresh(vo)
        return vo

    def create_order_item(self, item: VendorOrderItem) -> VendorOrderItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def create_modification(self, mod: VendorOrderModification) -> VendorOrderModification:
        self.db.add(mod)
        self.db.commit()
        self.db.refresh(mod)
        return mod

    def create_history_entry(self, history: ApprovalHistory) -> ApprovalHistory:
        self.db.add(history)
        self.db.commit()
        self.db.refresh(history)
        return history
        
    def get_all_orders_count(self) -> int:
        return self.db.query(MasterOrder).count()
        
    def get_completed_orders_count(self) -> int:
        return self.db.query(MasterOrder).filter(MasterOrder.status == "Completed").count()
        
    def get_total_revenue(self) -> float:
        result = self.db.query(MasterOrder).filter(MasterOrder.status == "Completed").all()
        return sum(o.total_bill_amount for o in result)
