from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError, ExpiredSignatureError
from sqlalchemy.orm import Session
from backend.core.config import settings
from backend.core.database import get_db
from backend.models.user import User
from backend.repositories.user import UserRepository

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(reusable_oauth2)
) -> User:
    """
    Validate the Bearer JWT and return the active User.

    Error differentiation:
      - 401  Token missing / malformed / expired / invalid type
      - 404  User record not found in the database
      - 400  User account is inactive / suspended
    """
    # ── JWT Decode ────────────────────────────────────────────────────────────
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or malformed authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── Token Type Guard ──────────────────────────────────────────────────────
    token_type = payload.get("type")
    if token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Access token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── Subject Extraction ────────────────────────────────────────────────────
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing user identity (sub claim).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token contains an invalid user identity.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── User Lookup ───────────────────────────────────────────────────────────
    user_repo = UserRepository(db)
    user = user_repo.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact the administrator.",
        )

    return user


def check_role(required_roles: list[str]):
    """
    Dependency factory: ensures the authenticated user holds one of the
    required roles, returning 403 (not 401) for insufficient permissions.
    """
    expanded_roles = set(required_roles)
    if "dcr" in expanded_roles:
        expanded_roles.add("administration")
    if "administration" in expanded_roles:
        expanded_roles.add("dcr")

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in expanded_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(required_roles)}. "
                       f"Your role: {current_user.role}.",
            )
        return current_user
    return role_checker
