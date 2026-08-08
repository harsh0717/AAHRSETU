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
        "approved": "Your order \"{title}\" has been approved.",
        "rejected": "Your order \"{title}\" has been rejected: {remarks}",
        "mod_requested": "{vendor} has requested a modification for order \"{title}\".",
        "bill_generated": "Master Invoice generated for order \"{title}\". Total: ₹{amount}",
        "completed": "Your order \"{title}\" has been marked as completed."
    },
    "hi": {
        "new_order": "{dept} विभाग से नया ऑर्डर प्राप्त हुआ: \"{title}\"",
        "approved": "आपका ऑर्डर \"{title}\" स्वीकृत हो गया है।",
        "rejected": "आपका ऑर्डर \"{title}\" अस्वीकृत हो गया है: {remarks}",
        "mod_requested": "{vendor} ने ऑर्डर \"{title}\" के लिए संशोधन का अनुरोध किया है।",
        "bill_generated": "ऑर्डर \"{title}\" का मास्टर चालान बनाया गया। कुल: ₹{amount}",
        "completed": "आपका ऑर्डर \"{title}\" पूर्ण चिह्नित किया गया है।"
    },
    "gu": {
        "new_order": "{dept} વિભાગ તરફથી નવો ઑર્ડર મળ્યો: \"{title}\"",
        "approved": "તમારો ઑર્ડર \"{title}\" મંજૂર થઈ ગયો છે.",
        "rejected": "તમારો ઑર્ડર \"{title}\" નામંજૂર થયો છે: {remarks}",
        "mod_requested": "{vendor} એ ઑર્ડર \"{title}\" માટે સુધારા વિનંતી કરી છે.",
        "bill_generated": "ઑર્ડર \"{title}\" નો માસ્ટર બિલ બન્યો છે. કુલ: ₹{amount}",
        "completed": "તમારો ઑર્ડર \"{title}\" પૂર્ણ તરીકે ચિહ્નિત થયો છે."
    }
}


class ConnectionManager:
    def __init__(self):
        # Maps user_id -> List[WebSocket]
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Maps role -> List[WebSocket]
        self.role_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int, role: str):
        await websocket.accept()
        
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
        order_id: Optional[str] = None,
        vendor_order_id: Optional[str] = None
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
            # Fetch users by role
            recipients = self.db.query(User).filter(User.role == recipient_role, User.active == True).all()

        for user in recipients:
            lang = user.preferred_language or "en"
            localized_msg = self._localize_message(lang, msg_key, params)
            
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
                timestamp=now
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
                "timestamp": notif.timestamp.isoformat()
            }
            # Push WebSocket Alert
            await manager.send_personal_message(ws_payload, user.id)

        self.db.commit()
        return created_notifications
