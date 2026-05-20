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


@router.get("/directory")
def get_employee_directory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """HR only: all active employees grouped by department for the printable directory."""
    if current_user.role != UserRole.HR:
        raise HTTPException(403, "HR access only")

    today = date.today()
    users = db.query(User).filter(User.is_active == True).order_by(User.full_name).all()

    dept_map: dict = {}
    for u in users:
        dept = u.department.name if u.department else "No Department"
        if dept not in dept_map:
            dept_map[dept] = []

        exp_str = "—"
        if u.joining_date:
            delta = today - u.joining_date
            years = delta.days // 365
            months = (delta.days % 365) // 30
            if years > 0 and months > 0:
                exp_str = f"{years} yr {months} mo"
            elif years > 0:
                exp_str = f"{years} yr"
            else:
                exp_str = f"{months} mo"

        dept_map[dept].append({
            "name": u.full_name,
            "role": u.role.value,
            "date_of_birth": str(u.date_of_birth) if u.date_of_birth else None,
            "joining_date": str(u.joining_date) if u.joining_date else None,
            "marital_status": u.marital_status.value if u.marital_status else None,
            "marriage_date": str(u.marriage_date) if u.marriage_date else None,
            "experience": exp_str,
        })

    return {
        "departments": [
            {"department": dept, "employees": dept_map[dept]}
            for dept in sorted(dept_map.keys())
        ],
        "generated_on": str(today),
        "total_employees": len(users),
    }


@router.get("/anniversaries")
def get_anniversaries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """HR/Admin only: return all employee birthdays, work anniversaries, marriage anniversaries grouped by month."""
    if current_user.role != UserRole.HR:
        raise HTTPException(403, "HR access only")

    today = date.today()
    users = db.query(User).filter(User.is_active == True).all()

    months: dict = {m: [] for m in range(1, 13)}

    def _days_until(month: int, day: int) -> int:
        try:
            target = date(today.year, month, day)
        except ValueError:
            target = date(today.year, month, 28)
        if target < today:
            try:
                target = date(today.year + 1, month, day)
            except ValueError:
                target = date(today.year + 1, month, 28)
        return (target - today).days

    for u in users:
        base = {
            "id": u.id,
            "name": u.full_name,
            "profile_image": u.profile_image,
            "department": u.department.name if u.department else "—",
            "role": u.role.value,
        }

        if u.date_of_birth:
            dob = u.date_of_birth
            years_old = today.year - dob.year
            du = _days_until(dob.month, dob.day)
            # upcoming (du <= 180): turning years_old this year
            # passed (du > 180):    turning years_old + 1 next year
            turning = years_old if du <= 180 else years_old + 1
            months[dob.month].append({
                **base,
                "type": "birthday",
                "day": dob.day,
                "month": dob.month,
                "original_year": dob.year,
                "year_info": f"Turning {turning}",
                "days_until": du,
            })

        if u.joining_date:
            jd = u.joining_date
            years_at = today.year - jd.year
            du = _days_until(jd.month, jd.day)
            # years_at = current_year - join_year is already the correct completion count
            if du == 0:
                label = f"{years_at} year{'s' if years_at != 1 else ''} today"
            elif du <= 180:
                label = f"Completing {years_at} year{'s' if years_at != 1 else ''}"
            else:
                label = f"Completed {years_at - 1} year{'s' if years_at - 1 != 1 else ''}"
            months[jd.month].append({
                **base,
                "type": "work_anniversary",
                "day": jd.day,
                "month": jd.month,
                "original_year": jd.year,
                "year_info": label,
                "days_until": du,
            })

        if u.marriage_date:
            md = u.marriage_date
            years_married = today.year - md.year
            du = _days_until(md.month, md.day)
            if du == 0:
                label = f"{years_married} year{'s' if years_married != 1 else ''} married"
            elif du <= 180:
                label = f"Completing {years_married} year{'s' if years_married != 1 else ''}"
            else:
                label = f"Completed {years_married - 1} year{'s' if years_married - 1 != 1 else ''}"
            months[md.month].append({
                **base,
                "type": "marriage_anniversary",
                "day": md.day,
                "month": md.month,
                "original_year": md.year,
                "year_info": label,
                "days_until": du,
            })

    for m in months:
        months[m].sort(key=lambda x: (x["day"], x["type"]))

    upcoming = sorted(
        [e for lst in months.values() for e in lst if 0 <= e["days_until"] <= 14],
        key=lambda x: x["days_until"]
    )

    return {
        "months": [{"month": m, "events": months[m]} for m in range(1, 13)],
        "upcoming": upcoming,
    }


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
