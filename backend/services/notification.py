import asyncio
import json
import random
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from fastapi import WebSocket
from sqlalchemy.orm import Session
from backend.models.notification import Notification
from backend.models.user import User
from backend.repositories.user import UserRepository

# Simple translation dictionaries for server-side push notifications
TRANSLATIONS = {
    "en": {
        "new_order": "New order received from {dept} Department: \"{title}\"",
        "order_submitted": "Master order \"{title}\" has been submitted for approval.",
        "approved": "Your order \"{title}\" has been approved.",
        "rejected": "Your order \"{title}\" has been rejected: {remarks}",
        "dcr_approved": "DCR has approved your order \"{title}\".",
        "dcr_rejected": "DCR has rejected your order \"{title}\": {remarks}",
        "mod_requested": "{vendor} has requested a modification for order \"{title}\".",
        "vendor_confirmed": "{vendor} has confirmed pricing for order \"{title}\".",
        "bill_generated": "Invoice generated for order \"{title}\". Total: ₹{amount}",
        "completed": "Your order \"{title}\" has been marked as completed.",
        "administrative": "Administrative notice: {message}"
    },
    "hi": {
        "new_order": "{dept} विभाग से नया ऑर्डर प्राप्त हुआ: \"{title}\"",
        "order_submitted": "मास्टर ऑर्डर \"{title}\" अनुमोदन के लिए जमा कर दिया गया है।",
        "approved": "आपका ऑर्डर \"{title}\" स्वीकृत हो गया है।",
        "rejected": "आपका ऑर्डर \"{title}\" अस्वीकृत हो गया है: {remarks}",
        "dcr_approved": "DCR ने आपके ऑर्डर \"{title}\" को मंजूरी दे दी है।",
        "dcr_rejected": "DCR ने आपके ऑर्डर \"{title}\" को खारिज कर दिया है: {remarks}",
        "mod_requested": "{vendor} ने ऑर्डर \"{title}\" के लिए संशोधन का अनुरोध किया है।",
        "vendor_confirmed": "{vendor} ने ऑर्डर \"{title}\" के लिए मूल्य की पुष्टि कर दी है।",
        "bill_generated": "ऑर्डर \"{title}\" का चालान बनाया गया। कुल: ₹{amount}",
        "completed": "आपका ऑर्डर \"{title}\" पूर्ण चिह्नित किया गया है।",
        "administrative": "प्रशासनिक सूचना: {message}"
    },
    "gu": {
        "new_order": "{dept} વિભાગ તરફથી નવો ઑર્ડર મળ્યો: \"{title}\"",
        "order_submitted": "માસ્ટર ઑર્ડર \"{title}\" મંજૂરી માટે સબમિટ કરવામાં આવ્યો છે.",
        "approved": "તમારો ઑર્ડર \"{title}\" મંજૂર થઈ ગયો છે.",
        "rejected": "તમારો ઑર્ડર \"{title}\" નામંજૂર થયો છે: {remarks}",
        "dcr_approved": "DCR એ તમારા ઑર્ડર \"{title}\" ને મંજૂરી આપી દીધી છે.",
        "dcr_rejected": "DCR એ તમારા ઑર્ડર \"{title}\" ને નકારી કાઢ્યો છે: {remarks}",
        "mod_requested": "{vendor} એ ઑર્ડર \"{title}\" માટે સુધારા વિનંતી કરી છે.",
        "vendor_confirmed": "{vendor} એ ઑર્ડર \"{title}\" માટે કિંમતની પુષ્ટિ કરી છે.",
        "bill_generated": "ઑર્ડર \"{title}\" નું બિલ બન્યું છે. કુલ: ₹{amount}",
        "completed": "તમારો ઑર્ડર \"{title}\" પૂર્ણ તરીકે ચિહ્નિત થયો છે.",
        "administrative": "વહીવટી સૂચના: {message}"
    }
}


class ConnectionManager:
    def __init__(self):
        # Maps user_id -> List[WebSocket]
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Maps role -> List[WebSocket]
        self.role_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int, role: str, subprotocol: Optional[str] = None):
        await websocket.accept(subprotocol=subprotocol)
        
        # User ID connection registration
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        
        # Role connection registration
        if role not in self.role_connections:
            self.role_connections[role] = []
        self.role_connections[role].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int, role: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                
        if role in self.role_connections:
            if websocket in self.role_connections[role]:
                self.role_connections[role].remove(websocket)
            if not self.role_connections[role]:
                del self.role_connections[role]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass # Closed connections handled gracefully

    async def broadcast_to_role(self, message: dict, role: str):
        if role in self.role_connections:
            for connection in self.role_connections[role]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def broadcast(self, message: dict):
        for user_conns in self.active_connections.values():
            for connection in user_conns:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass


manager = ConnectionManager()


class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)

    def _localize_message(self, lang: str, msg_key: str, params: dict) -> str:
        lang_dict = TRANSLATIONS.get(lang, TRANSLATIONS["en"])
        template = lang_dict.get(msg_key, TRANSLATIONS["en"].get(msg_key, msg_key))
        return template.format(**params)

    async def create_and_send_notification(
        self,
        msg_key: str,
        params: dict,
        msg_type: str,
        recipient_id: Optional[int] = None,
        recipient_role: Optional[str] = None,
        vendor_id: Optional[str] = None,
        order_id: Optional[str] = None,
        vendor_order_id: Optional[str] = None,
        route: Optional[str] = None
    ) -> List[Notification]:
        now = datetime.now(timezone.utc)
        created_notifications = []

        # Find target recipients
        recipients = []
        if recipient_id:
            user = self.user_repo.get(recipient_id)
            if user:
                recipients.append(user)
        elif recipient_role:
            if recipient_role == "principal" and order_id:
                # Route only to Principals supervising the order's department
                from backend.models.order import MasterOrder
                from backend.models.department import Department
                order = self.db.query(MasterOrder).filter(MasterOrder.id == order_id).first()
                if order and order.department_id:
                    query = self.db.query(User).join(User.managed_departments).filter(
                        User.role == "principal",
                        User.active == True,
                        Department.id == order.department_id
                    )
                    recipients = query.all()
                else:
                    recipients = self.db.query(User).filter(User.role == "principal", User.active == True).all()
            else:
                query = self.db.query(User).filter(User.role == recipient_role, User.active == True)
                if recipient_role == "vendor" and vendor_id:
                    query = query.filter(User.vendor_id == vendor_id)
                recipients = query.all()

        for user in recipients:
            lang = user.preferred_language or "en"
            localized_msg = self._localize_message(lang, msg_key, params)
            
            # Auto-resolve route if not provided
            final_route = route
            if not final_route:
                if msg_type == "new_order":
                    final_route = "/principal#approvals"
                elif msg_type == "order_submitted":
                    final_route = "/dcr#approvals"
                elif msg_type in ["approved", "rejected", "dcr_approved", "dcr_rejected", "vendor_confirmed", "completed"]:
                    final_route = "/coordinator/orders"
                elif msg_type == "mod_requested":
                    final_route = f"/order/{order_id}" if order_id else "/coordinator/orders"
                elif msg_type == "bill_generated":
                    final_route = f"/bill/{order_id}" if order_id else "/coordinator/bills"

            notif_id = f"notif-{int(now.timestamp())}-{random.randint(1000, 9999)}"
            notif = Notification(
                id=notif_id,
                recipient_id=user.id,
                recipient_role=user.role if not recipient_id else None,
                message=localized_msg,
                type=msg_type,
                order_id=order_id,
                vendor_order_id=vendor_order_id,
                read=False,
                timestamp=now,
                route=final_route
            )
            self.db.add(notif)
            created_notifications.append(notif)

            # Build WebSocket Payload
            ws_payload = {
                "id": notif.id,
                "message": notif.message,
                "type": notif.type,
                "order_id": notif.order_id,
                "vendor_order_id": notif.vendor_order_id,
                "read": notif.read,
                "timestamp": notif.timestamp.isoformat(),
                "route": notif.route
            }
            # Push WebSocket Alert
            await manager.send_personal_message(ws_payload, user.id)

        self.db.commit()
        return created_notifications

    async def notify_order_updated(self, order_id: str):
        """
        Broadcast an ORDER_UPDATED WS message to all users interested in this order.
        """
        from backend.models.order import MasterOrder
        order = self.db.query(MasterOrder).filter(MasterOrder.id == order_id).first()
        if not order:
            return
            
        recipient_ids = set()
        
        # 1. Creator
        if order.created_by_id:
            recipient_ids.add(order.created_by_id)
            
        # 2. Principals overseeing the department
        if order.department_id:
            from backend.models.user import User
            from backend.models.department import Department
            principals = self.db.query(User).join(User.managed_departments).filter(
                User.role == "principal",
                User.active == True,
                Department.id == order.department_id
            ).all()
            for p in principals:
                recipient_ids.add(p.id)
                
        # 3. DCR
        dcrs = self.db.query(User).filter(User.role == "dcr", User.active == True).all()
        for d in dcrs:
            recipient_ids.add(d.id)
            
        # 4. Vendors
        for vo in order.vendor_orders:
            vendor_users = self.db.query(User).filter(
                User.role == "vendor",
                User.vendor_id == vo.vendor_id,
                User.active == True
            ).all()
            for vu in vendor_users:
                recipient_ids.add(vu.id)
                
        # 5. Admins
        admins = self.db.query(User).filter(User.role == "admin", User.active == True).all()
        for a in admins:
            recipient_ids.add(a.id)
            
        ws_payload = {
            "type": "ORDER_UPDATED",
            "order_id": order_id,
            "status": order.status
        }
        for u_id in recipient_ids:
            await manager.send_personal_message(ws_payload, u_id)
