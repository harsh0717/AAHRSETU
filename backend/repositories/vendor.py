from typing import List, Optional
from sqlalchemy.orm import Session
from backend.models.vendor import Vendor, VendorMenuItem
from backend.repositories.base import BaseRepository


class VendorRepository(BaseRepository[Vendor]):
    def __init__(self, db: Session):
        super().__init__(Vendor, db)

    def get_by_email(self, email: str) -> Optional[Vendor]:
        return self.db.query(Vendor).filter(Vendor.email == email).first()

    def get_menu_items(self, vendor_id: str) -> List[VendorMenuItem]:
        return self.db.query(VendorMenuItem).filter(VendorMenuItem.vendor_id == vendor_id).all()

    def get_menu_item(self, vendor_id: str, item_id: str) -> Optional[VendorMenuItem]:
        return self.db.query(VendorMenuItem).filter(
            VendorMenuItem.vendor_id == vendor_id,
            VendorMenuItem.id == item_id
        ).first()

    def create_menu_item(self, item: VendorMenuItem) -> VendorMenuItem:
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def remove_menu_item(self, vendor_id: str, item_id: str) -> None:
        item = self.get_menu_item(vendor_id, item_id)
        if item:
            self.db.delete(item)
            self.db.commit()
            
    def get_available_menu_items(self) -> List[VendorMenuItem]:
        # Returns all menu items for open vendors that are marked as available
        return self.db.query(VendorMenuItem).join(Vendor).filter(
            Vendor.status == "open",
            VendorMenuItem.available == True
        ).all()
