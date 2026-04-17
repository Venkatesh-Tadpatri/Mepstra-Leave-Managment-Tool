from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.db.database import get_db
from app.api.deps import get_current_user, require_admin, require_manager
from app.schemas.schemas import UserResponse, UserUpdate, UserSummary, ResetPasswordRequest
from app.core.security import get_password_hash
from app.models.models import User, UserRole, EmergencyLeaveOverride
import shutil, os, uuid

router = APIRouter(prefix="/users", tags=["Users"])
UPLOAD_DIR = "uploads/profiles"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(data: UserUpdate, db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    for k, v in data.model_dump(exclude_none=True).items():
        if k not in ("role", "is_active"):  # self can't change role
            setattr(current_user, k, v)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=UserResponse)
def upload_avatar(file: UploadFile = File(...), db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    path = f"{UPLOAD_DIR}/{filename}"
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    current_user.profile_image = f"/uploads/profiles/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me/avatar", response_model=UserResponse)
def remove_avatar(db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    if current_user.profile_image:
        file_path = current_user.profile_image.lstrip("/")
        if os.path.exists(file_path):
            os.remove(file_path)
        current_user.profile_image = None
        db.commit()
        db.refresh(current_user)
    return current_user


@router.get("", response_model=List[UserResponse])
def list_users(role: Optional[str] = None, department_id: Optional[int] = None,
               db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    q = db.query(User)

    # Role-based visibility:
    # - Admin/HR/Main Manager: can see all users
    # - Manager: only employees assigned to this manager
    # - Team Lead: only employees assigned to this team lead
    # - Employee: only self
    if current_user.role == UserRole.MANAGER:
        q = q.filter(User.role == UserRole.EMPLOYEE, User.manager_id == current_user.id)
    elif current_user.role == UserRole.TEAM_LEAD:
        q = q.filter(User.role == UserRole.EMPLOYEE, User.team_lead_id == current_user.id)
    elif current_user.role == UserRole.EMPLOYEE:
        q = q.filter(User.id == current_user.id)

    if role:
        q = q.filter(User.role == role)
    if department_id:
        q = q.filter(User.department_id == department_id)
    return q.all()


@router.get("/managers", response_model=List[UserSummary])
def list_managers(db: Session = Depends(get_db)):
    return db.query(User).filter(
        User.role.in_([UserRole.MANAGER, UserRole.MAIN_MANAGER, UserRole.TEAM_LEAD, UserRole.HR])
    ).all()


@router.get("/admin", response_model=UserSummary)
def get_admin_user(db: Session = Depends(get_db)):
    admin = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active == True).first()
    if not admin:
        raise HTTPException(404, "Admin user not found")
    return admin


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db),
             current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    if current_user.role == UserRole.EMPLOYEE and user.id != current_user.id:
        raise HTTPException(403, "Not authorized")
    if current_user.role == UserRole.MANAGER:
        if user.role != UserRole.EMPLOYEE or user.manager_id != current_user.id:
            raise HTTPException(403, "Not authorized")
    if current_user.role == UserRole.TEAM_LEAD:
        if user.role != UserRole.EMPLOYEE or user.team_lead_id != current_user.id:
            raise HTTPException(403, "Not authorized")

    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db),
                _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def deactivate_user(user_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_active = False
    db.commit()
    return {"message": "User deactivated"}


@router.post("/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"message": f"PIN reset successfully for {user.full_name}"}


@router.get("/me/emergency-override-today")
def get_my_emergency_override_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    enabled = db.query(EmergencyLeaveOverride).filter(
        EmergencyLeaveOverride.user_id == current_user.id,
        EmergencyLeaveOverride.override_date == date.today()
    ).first() is not None
    return {"enabled": enabled, "date": date.today().isoformat()}


@router.get("/overrides-today")
def get_overrides_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    """Return the user_ids of team members who have emergency override enabled today."""
    today = date.today()
    q = db.query(EmergencyLeaveOverride).filter(
        EmergencyLeaveOverride.override_date == today
    )
    # Manager / team lead: only their team
    if current_user.role in [UserRole.MANAGER, UserRole.TEAM_LEAD]:
        team_ids = [
            u.id for u in db.query(User).filter(
                User.role == UserRole.EMPLOYEE,
                User.is_active == True,
            ).filter(
                (User.manager_id == current_user.id) | (User.team_lead_id == current_user.id)
            ).all()
        ]
        q = q.filter(EmergencyLeaveOverride.user_id.in_(team_ids))
    overrides = q.all()
    return {"user_ids": [o.user_id for o in overrides]}


@router.post("/{user_id}/emergency-override-today")
def enable_emergency_override_today(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    target_user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not target_user:
        raise HTTPException(404, "User not found")

    if current_user.role in [UserRole.MANAGER, UserRole.TEAM_LEAD]:
        if target_user.manager_id != current_user.id and target_user.team_lead_id != current_user.id:
            raise HTTPException(403, "Not authorized to enable override for this employee")

    today = date.today()
    existing = db.query(EmergencyLeaveOverride).filter(
        EmergencyLeaveOverride.user_id == user_id,
        EmergencyLeaveOverride.override_date == today
    ).first()
    if existing:
        return {"message": "Already enabled for today", "date": today.isoformat()}

    override = EmergencyLeaveOverride(
        user_id=user_id,
        override_date=today,
        enabled_by_id=current_user.id
    )
    db.add(override)
    db.commit()
    return {"message": "Emergency override enabled for today", "date": today.isoformat()}


@router.delete("/{user_id}/emergency-override-today")
def disable_emergency_override_today(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    target_user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not target_user:
        raise HTTPException(404, "User not found")

    if current_user.role in [UserRole.MANAGER, UserRole.TEAM_LEAD]:
        if target_user.manager_id != current_user.id and target_user.team_lead_id != current_user.id:
            raise HTTPException(403, "Not authorized to modify override for this employee")

    today = date.today()
    existing = db.query(EmergencyLeaveOverride).filter(
        EmergencyLeaveOverride.user_id == user_id,
        EmergencyLeaveOverride.override_date == today
    ).first()
    if not existing:
        return {"message": "Override not active for today"}

    db.delete(existing)
    db.commit()
    return {"message": "Emergency override disabled for today", "date": today.isoformat()}
