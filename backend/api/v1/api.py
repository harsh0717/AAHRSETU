from fastapi import APIRouter
from backend.api.v1.endpoints import auth, users, vendors, orders, notifications, reports, settings, bills, settlements

api_router = APIRouter(redirect_slashes=True)

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["vendors"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(bills.router, prefix="/bills", tags=["bills"])
api_router.include_router(settlements.router, prefix="/settlements", tags=["settlements"])
