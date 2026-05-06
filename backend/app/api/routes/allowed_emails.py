from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from datetime import date
from app.db.database import get_db
from app.api.deps import require_admin_or_hr, get_current_user
from app.schemas.schemas import AllowedEmailCreate, AllowedEmailUpdate, AllowedEmailResponse
from app.models.models import AllowedEmail, User, UserRole, LeaveBalance

router = APIRouter(prefix="/allowed-emails", tags=["Allowed Emails"])


@router.get("", response_model=List[AllowedEmailResponse])
def list_allowed_emails(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all whitelisted employees. Accessible by Admin and HR."""
    if current_user.role not in [UserRole.ADMIN, UserRole.HR]:
        raise HTTPException(403, "Not authorized")
    return db.query(AllowedEmail).order_by(AllowedEmail.employee_name).all()


@router.post("", response_model=AllowedEmailResponse, status_code=201)
def add_allowed_email(
    data: AllowedEmailCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_hr),
):
    """Add an employee with their outlook/gmail to the whitelist. Admin or HR."""
    if data.outlook_email:
        if db.query(AllowedEmail).filter(AllowedEmail.outlook_email == data.outlook_email).first():
            raise HTTPException(400, "This Outlook email is already in the whitelist")
    if data.gmail:
        if db.query(AllowedEmail).filter(AllowedEmail.gmail == data.gmail).first():
            raise HTTPException(400, "This Gmail is already in the whitelist")

    entry = AllowedEmail(
        employee_name=data.employee_name,
        outlook_email=data.outlook_email,
        gmail=data.gmail,
        notes=data.notes,
        casual_leaves=data.casual_leaves,
        sick_leaves=data.sick_leaves,
        optional_leaves=data.optional_leaves,
        added_by_id=current_user.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/bulk-upsert", status_code=201)
def bulk_upsert_allowed_emails(
    data: List[AllowedEmailCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_hr),
):
    """Create or update whitelist employees from an Excel upload."""
    created = []
    updated = []

    for item in data:
        matches = []
        if item.outlook_email:
            match = db.query(AllowedEmail).filter(AllowedEmail.outlook_email == item.outlook_email).first()
            if match:
                matches.append(match)
        if item.gmail:
            match = db.query(AllowedEmail).filter(AllowedEmail.gmail == item.gmail).first()
            if match and all(existing.id != match.id for existing in matches):
                matches.append(match)

        if len(matches) > 1:
            raise HTTPException(
                400,
                f"{item.employee_name} has emails that belong to different whitelist rows. Fix the Excel file and try again.",
            )

        entry = matches[0] if matches else None
        if entry:
            entry.employee_name = item.employee_name
            entry.outlook_email = item.outlook_email
            entry.gmail = item.gmail
            entry.notes = item.notes
            entry.casual_leaves = item.casual_leaves
            entry.sick_leaves = item.sick_leaves
            entry.optional_leaves = item.optional_leaves
            updated.append(item.employee_name)
            continue

        entry = AllowedEmail(
            employee_name=item.employee_name,
            outlook_email=item.outlook_email,
            gmail=item.gmail,
            notes=item.notes,
            casual_leaves=item.casual_leaves,
            sick_leaves=item.sick_leaves,
            optional_leaves=item.optional_leaves,
            added_by_id=current_user.id,
        )
        db.add(entry)
        created.append(item.employee_name)

    db.commit()
    return {
        "created": len(created),
        "updated": len(updated),
        "created_names": created,
        "updated_names": updated,
    }


@router.patch("/{entry_id}", response_model=AllowedEmailResponse)
def update_allowed_email(
    entry_id: int,
    data: AllowedEmailUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin_or_hr),
):
    """Update outlook/gmail/notes for an existing whitelist entry. Admin or HR."""
    entry = db.query(AllowedEmail).filter(AllowedEmail.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Entry not found")

    if data.outlook_email is not None:
        conflict = db.query(AllowedEmail).filter(
            AllowedEmail.outlook_email == data.outlook_email,
            AllowedEmail.id != entry_id,
        ).first()
        if conflict:
            raise HTTPException(400, "This Outlook email is already in the whitelist")
        entry.outlook_email = data.outlook_email or None

    if data.gmail is not None:
        conflict = db.query(AllowedEmail).filter(
            AllowedEmail.gmail == data.gmail,
            AllowedEmail.id != entry_id,
        ).first()
        if conflict:
            raise HTTPException(400, "This Gmail is already in the whitelist")
        entry.gmail = data.gmail or None

    if data.notes is not None:
        entry.notes = data.notes or None

    leave_changed = False
    if data.casual_leaves is not None:
        entry.casual_leaves = data.casual_leaves
        leave_changed = True
    if data.sick_leaves is not None:
        entry.sick_leaves = data.sick_leaves
        leave_changed = True
    if data.optional_leaves is not None:
        entry.optional_leaves = data.optional_leaves
        leave_changed = True

    db.commit()
    db.refresh(entry)

    # Sync leave balance for the registered user for the current year
    if leave_changed and entry.registered_user_id:
        year = date.today().year
        balance = db.query(LeaveBalance).filter(
            LeaveBalance.user_id == entry.registered_user_id,
            LeaveBalance.year == year,
        ).first()
        if balance:
            if data.casual_leaves is not None:
                balance.casual_total = data.casual_leaves
            if data.sick_leaves is not None:
                balance.sick_total = data.sick_leaves
            if data.optional_leaves is not None:
                balance.optional_total = data.optional_leaves
            db.commit()

    return entry


@router.delete("/{entry_id}", status_code=200)
def remove_allowed_email(
    entry_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin_or_hr),
):
    """Remove an employee from the registration whitelist. Admin or HR."""
    entry = db.query(AllowedEmail).filter(AllowedEmail.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Employee removed from whitelist"}
