import os
import uuid
import shutil
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Response
from sqlalchemy.orm import Session
from backend.api import deps
from backend.core.database import get_db
from backend.core.security import get_password_hash
from backend.models.user import User, Department
from backend.repositories.user import UserRepository
from backend.schemas.user import UserCreate, UserResponse, UserUpdate, DepartmentResponse

router = APIRouter()

# Allowed image MIME types for profile photos
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024  # 5MB


def _user_to_response(u: User) -> UserResponse:
    """Convert a User ORM object to a UserResponse schema."""
    principal_depts = [d.id for d in u.managed_departments]
    return UserResponse(
        id=u.id,
        name=u.name,
        email=u.email,
        role=u.role,
        department_id=u.department_id,
        vendor_id=u.vendor_id,
        preferred_language=u.preferred_language,
        avatar_url=u.avatar_url,
        avatar_version=u.avatar_version or 1,
        mobile_number=u.mobile_number,
        profile_setup_completed=u.profile_setup_completed or False,
        profile_setup_skipped=u.profile_setup_skipped or False,
        active=u.active,
        principal_depts=principal_depts,
        created_at=u.created_at,
    )


@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(
    db: Session = Depends(get_db)
) -> Any:
    """
    Get all institutional departments.
    """
    user_repo = UserRepository(db)
    return user_repo.get_departments()


@router.get("", response_model=List[UserResponse])
def read_users(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.check_role(["admin"]))
) -> Any:
    """
    Retrieve all registered users (Admin-only).
    """
    user_repo = UserRepository(db)
    users = user_repo.get_multi(skip=skip, limit=limit)
    return [_user_to_response(u) for u in users]


@router.post("", response_model=UserResponse)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin"]))
) -> Any:
    """
    Create a new user account (Admin-only).
    """
    user_repo = UserRepository(db)
    existing = user_repo.get_by_email(payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    db_user = User(
        name=payload.name,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        department_id=payload.department_id if payload.role == "coordinator" else None,
        vendor_id=payload.vendor_id if payload.role == "vendor" else None,
        preferred_language=payload.preferred_language,
        active=payload.active
    )
    user_repo.create(db_user)

    if payload.role == "principal" and payload.principal_depts:
        user_repo.set_managed_departments(db_user, payload.principal_depts)

    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action="User Created",
        new_value=f"ID: {db_user.id}, Email: {db_user.email}, Role: {db_user.role}"
    )

    return _user_to_response(db_user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Update an existing user account.
    Admins can update any user. Users can update their own profile fields only.
    """
    user_repo = UserRepository(db)
    db_user = user_repo.get(user_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this profile"
        )

    if payload.email and payload.email != db_user.email:
        conflict = user_repo.get_by_email(payload.email)
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists."
            )

    update_data = payload.model_dump(exclude_unset=True)

    if current_user.role != "admin":
        update_data.pop("role", None)
        update_data.pop("department_id", None)
        update_data.pop("vendor_id", None)
        update_data.pop("active", None)
        update_data.pop("principal_depts", None)

    if "password" in update_data and update_data["password"]:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))
    else:
        update_data.pop("password", None)

    principal_depts_list = update_data.pop("principal_depts", None)

    old_name = db_user.name
    old_email = db_user.email
    old_lang = db_user.preferred_language

    if "avatar_url" in update_data and update_data["avatar_url"]:
        db_user.avatar_version = (db_user.avatar_version or 1) + 1
        update_data["avatar_version"] = db_user.avatar_version

    user_repo.update(db_user, update_data)

    if principal_depts_list is not None and db_user.role == "principal":
        user_repo.set_managed_departments(db_user, principal_depts_list)

    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action="User Updated",
        old_value=f"ID: {db_user.id}, Name: {old_name}, Email: {old_email}, Language: {old_lang}",
        new_value=f"Name: {db_user.name}, Email: {db_user.email}, Language: {db_user.preferred_language}"
    )

    # Broadcast PROFILE_UPDATED to WebSocket clients with full profile data
    try:
        from backend.services.notification import manager
        await manager.broadcast({
            "type": "PROFILE_UPDATED",
            "user_id": db_user.id,
            "name": db_user.name,
            "mobile_number": db_user.mobile_number,
            "avatar_url": db_user.avatar_url,
            "avatar_version": db_user.avatar_version or 1,
            "profile_setup_completed": db_user.profile_setup_completed or False,
            "profile_setup_skipped": db_user.profile_setup_skipped or False
        })
    except Exception as err:
        print(f"[WS BROADCAST ERROR] Failed to broadcast profile update: {err}")

    return _user_to_response(db_user)


@router.post("/{user_id}/avatar", response_model=UserResponse)
async def upload_avatar(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Upload a profile photo for a user.
    Validates file type (JPEG/PNG/WEBP) and size (max 5MB).
    Saves to persistent storage and updates the user's avatar_url in the database.
    """
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user's avatar"
        )

    # Validate MIME type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{content_type}'. Only JPEG, PNG, and WEBP images are allowed."
        )

    # Read and validate file size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_AVATAR_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 5MB limit."
        )

    # Validate file signature (magic bytes)
    if content_type == "image/jpeg" and not file_bytes[:3] == b'\xff\xd8\xff':
        raise HTTPException(status_code=400, detail="Invalid JPEG file.")
    elif content_type == "image/png" and not file_bytes[:8] == b'\x89PNG\r\n\x1a\n':
        raise HTTPException(status_code=400, detail="Invalid PNG file.")

    user_repo = UserRepository(db)
    db_user = user_repo.get(user_id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # New avatar version
    new_version = (db_user.avatar_version or 1) + 1

    # Determine extension from content type
    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
    ext = ext_map.get(content_type, "jpg")

    from backend.models.stored_file import StoredFile

    # Delete old avatar from database if it exists
    if db_user.avatar_url:
        old_filename = os.path.basename(db_user.avatar_url.split("?")[0])
        try:
            db.query(StoredFile).filter(StoredFile.filename == old_filename).delete()
            db.commit()
        except Exception:
            db.rollback()

    filename = f"user_{user_id}_v{new_version}_{uuid.uuid4().hex[:8]}.{ext}"

    # Save to database StoredFile
    stored_file = StoredFile(
        filename=filename,
        content_type=content_type,
        data=file_bytes
    )
    db.add(stored_file)
    db.commit()

    # Build dynamic serving URL
    avatar_url = f"/api/v1/users/avatar/{filename}"

    # Update database
    user_repo.update(db_user, {
        "avatar_url": avatar_url,
        "avatar_version": new_version
    })

    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action="Avatar Updated",
        new_value=f"User ID: {user_id}, URL: {avatar_url}"
    )

    # Broadcast PROFILE_UPDATED with full profile data
    try:
        from backend.services.notification import manager
        await manager.broadcast({
            "type": "PROFILE_UPDATED",
            "user_id": db_user.id,
            "name": db_user.name,
            "mobile_number": db_user.mobile_number,
            "avatar_url": avatar_url,
            "avatar_version": new_version,
            "profile_setup_completed": db_user.profile_setup_completed or False,
            "profile_setup_skipped": db_user.profile_setup_skipped or False
        })
    except Exception as err:
        print(f"[WS BROADCAST ERROR] Failed to broadcast avatar update: {err}")

    return _user_to_response(db_user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.check_role(["admin"]))
) -> None:
    """
    Delete a user account (Admin-only). Prevents self-deletion.
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Self-deletion is prohibited."
        )

    user_repo = UserRepository(db)
    target_user = user_repo.get(user_id)
    target_email = target_user.email if target_user else str(user_id)

    removed = user_repo.remove(user_id)
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    from backend.repositories.audit import AuditRepository
    audit_repo = AuditRepository(db)
    audit_repo.log_action(
        user_id=current_user.id,
        role=current_user.role,
        department=current_user.department_id or "General",
        action="User Deleted",
        old_value=f"ID: {user_id}, Email: {target_email}"
    )
    return None


@router.get("/avatar/{filename}")
def get_user_avatar(filename: str, db: Session = Depends(get_db)) -> Any:
    """
    Retrieve user avatar binary data from the persistent database.
    """
    from backend.models.stored_file import StoredFile
    stored_file = db.query(StoredFile).filter(StoredFile.filename == filename).first()
    if not stored_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")
    return Response(content=stored_file.data, media_type=stored_file.content_type)
