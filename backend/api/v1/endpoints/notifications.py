from typing import Any, List
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
from backend.api import deps
from backend.core.database import get_db
from backend.models.user import User
from backend.models.notification import Notification
from backend.schemas.notification import NotificationResponse
from backend.services.notification import manager, NotificationService
from jose import jwt, JWTError
from backend.core.config import settings

router = APIRouter()


@router.get("/", response_model=List[NotificationResponse])
def get_my_notifications(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get paginated notifications for the active user session.
    """
    notifications = db.query(Notification).filter(
        Notification.recipient_id == current_user.id
    ).order_by(Notification.timestamp.desc()).offset(skip).limit(limit).all()
    return notifications


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Mark a specific notification as read.
    """
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.recipient_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.post("/read-all", status_code=204)
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> None:
    """
    Mark all notifications for the active user as read.
    """
    db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.read == False
    ).update({"read": True}, synchronize_session=False)
    db.commit()
    return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str,
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time notifications.
    Authenticates token, registers connection with ConnectionManager.
    """
    # 1. Authenticate user from query parameter token
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = int(payload.get("sub"))
    except Exception:
        await websocket.close(code=4001) # Unauthorized
        return

    user = db.query(User).filter(User.id == user_id, User.active == True).first()
    if not user:
        await websocket.close(code=4002) # User not active
        return

    # 2. Register connection
    await manager.connect(websocket, user.id, user.role)
    
    # 3. Handle connection lifecycle
    try:
        while True:
            # Maintain connection (wait for client keepalives or close)
            data = await websocket.receive_text()
            # Respond to ping
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id, user.role)
    except Exception:
        manager.disconnect(websocket, user.id, user.role)
