from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from app.db.database import get_db
from app.api.deps import require_admin_or_hr, get_current_user
from app.schemas.schemas import AllowedEmailCreate, AllowedEmailUpdate, AllowedEmailResponse
from app.models.models import AllowedEmail, User, UserRole

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
        added_by_id=current_user.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


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

    db.commit()
    db.refresh(entry)
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
