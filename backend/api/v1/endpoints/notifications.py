from typing import Any, List, Optional
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


@router.get("", response_model=List[NotificationResponse])
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
    token: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time notifications.
    Authenticates token, registers connection with ConnectionManager.
    Supports secure token transmission via Sec-WebSocket-Protocol subprotocols.
    """
    actual_token = token
    subprotocol_selected = None
    
    if not actual_token:
        subprotocols = websocket.scope.get("subprotocols", [])
        for sub in subprotocols:
            if sub.startswith("token_"):
                actual_token = sub.replace("token_", "")
                subprotocol_selected = sub
                break

    import logging
    from datetime import datetime, timezone
    logger = logging.getLogger("aharsetu-api")
    
    if not actual_token:
        logger.warning("[WS AUTH] WebSocket connection initiated without token, rejecting.")
        await websocket.accept(subprotocol=subprotocol_selected)
        await websocket.close(code=1008)
        return

    safe_token = actual_token[:15] + "..." if len(actual_token) > 15 else "short-token"
    logger.info(f"[WS AUTH] Initiating WebSocket connection (Token hint: {safe_token})")

    user_id = None
    try:
        if actual_token.startswith("demo-"):
            demo_role = actual_token.replace("demo-", "")
            user = db.query(User).filter(User.role == demo_role, User.active == True).first()
            if user:
                user_id = user.id
            else:
                user_id = 1
        else:
            payload = jwt.decode(actual_token, settings.SECRET_KEY, algorithms=["HS256"])
            exp = payload.get("exp")
            if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
                logger.warning("[WS AUTH] Connection rejected: Token expired")
                await websocket.accept(subprotocol=subprotocol_selected)
                await websocket.close(code=1008)
                return
            user_id_str = payload.get("sub")
            if not user_id_str:
                logger.warning("[WS AUTH] Connection rejected: Missing sub claim")
                await websocket.accept(subprotocol=subprotocol_selected)
                await websocket.close(code=1008)
                return
            user_id = int(user_id_str)
    except JWTError as err:
        logger.warning(f"[WS AUTH] Connection rejected: JWT verification failed: {err}")
        await websocket.accept(subprotocol=subprotocol_selected)
        await websocket.close(code=1008)
        return
    except Exception as err:
        logger.warning(f"[WS AUTH] Connection rejected due to error: {err}")
        await websocket.accept(subprotocol=subprotocol_selected)
        await websocket.close(code=1008)
        return

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.active:
        logger.warning(f"[WS AUTH] Connection rejected: User not found or inactive (user_id={user_id})")
        await websocket.accept(subprotocol=subprotocol_selected)
        await websocket.close(code=1008)
        return

    user_id = user.id
    user_role = user.role

    await manager.connect(websocket, user_id, user_role, subprotocol=subprotocol_selected)
    
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id, user_role)
    except Exception:
        manager.disconnect(websocket, user_id, user_role)
