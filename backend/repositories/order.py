from typing import List, Optional
from sqlalchemy.orm import Session, selectinload, joinedload
from backend.models.order import (
    MasterOrder, VendorOrder, VendorOrderItem,
    VendorOrderModification, ApprovalHistory
)
from backend.repositories.base import BaseRepository


def _eager_order_query(db: Session):
    """
    Return a base query for MasterOrder with all nested relationships
    eagerly loaded in a single round-trip (no N+1 queries).
    """
    return db.query(MasterOrder).options(
        selectinload(MasterOrder.vendor_orders).options(
            selectinload(VendorOrder.items),
            selectinload(VendorOrder.modification),
            joinedload(VendorOrder.vendor),   # vendor name needed for responses
        ),
        selectinload(MasterOrder.history),
    )


class OrderRepository(BaseRepository[MasterOrder]):
    def __init__(self, db: Session):
        super().__init__(MasterOrder, db)

    def get_by_id(self, order_id: str) -> Optional[MasterOrder]:
        return _eager_order_query(self.db).filter(MasterOrder.id == order_id).first()

    def get_by_coordinator(self, coordinator_id: int, department_id: Optional[str] = None) -> List[MasterOrder]:
        query = _eager_order_query(self.db)
        if department_id:
            query = query.filter(
                (MasterOrder.created_by_id == coordinator_id) |
                (MasterOrder.department_id == department_id)
            )
        else:
            query = query.filter(MasterOrder.created_by_id == coordinator_id)
        return query.order_by(MasterOrder.created_at.desc()).all()

    def get_by_departments(self, department_ids: List[str], principal_id: Optional[int] = None) -> List[MasterOrder]:
        query = _eager_order_query(self.db)
        conditions = []
        if department_ids:
            conditions.append(MasterOrder.department_id.in_(department_ids))
        if principal_id:
            conditions.append(MasterOrder.created_by_id == principal_id)
        if conditions:
            from sqlalchemy import or_
            query = query.filter(or_(*conditions))
        return query.order_by(MasterOrder.created_at.desc()).all()

    def get_by_vendor(self, vendor_id: str) -> List[MasterOrder]:
        return (
            _eager_order_query(self.db)
            .join(VendorOrder, MasterOrder.id == VendorOrder.master_order_id)
            .filter(VendorOrder.vendor_id == vendor_id)
            .order_by(MasterOrder.created_at.desc())
            .all()
        )

    def get_multi(self) -> List[MasterOrder]:  # type: ignore[override]
        return (
            _eager_order_query(self.db)
            .order_by(MasterOrder.created_at.desc())
            .all()
        )

    def get_vendor_order(self, vendor_order_id: str) -> Optional[VendorOrder]:
        return (
            self.db.query(VendorOrder)
            .options(
                selectinload(VendorOrder.items),
                selectinload(VendorOrder.modification),
                joinedload(VendorOrder.vendor),
            )
            .filter(VendorOrder.id == vendor_order_id)
            .first()
        )

    def get_vendor_orders_for_master(self, master_order_id: str) -> List[VendorOrder]:
        return (
            self.db.query(VendorOrder)
            .options(
                selectinload(VendorOrder.items),
                selectinload(VendorOrder.modification),
            )
            .filter(VendorOrder.master_order_id == master_order_id)
            .all()
        )

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
        from sqlalchemy import func
        from backend.models.order import VendorOrder
        result = self.db.query(func.coalesce(func.sum(MasterOrder.total_bill_amount), 0.0)).filter(
            MasterOrder.status == "Completed"
        ).scalar()
        return float(result or 0.0)
