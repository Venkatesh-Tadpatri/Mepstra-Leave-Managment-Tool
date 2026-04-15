from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.api.deps import require_admin, get_current_user
from app.schemas.schemas import AllowedEmailCreate, AllowedEmailResponse
from app.models.models import AllowedEmail, User, UserRole

router = APIRouter(prefix="/allowed-emails", tags=["Allowed Emails"])


@router.get("", response_model=List[AllowedEmailResponse])
def list_allowed_emails(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all whitelisted emails. Accessible by Admin and HR."""
    if current_user.role not in [UserRole.ADMIN, UserRole.HR]:
        raise HTTPException(403, "Not authorized")
    return db.query(AllowedEmail).order_by(AllowedEmail.created_at.desc()).all()


@router.post("", response_model=AllowedEmailResponse, status_code=201)
def add_allowed_email(
    data: AllowedEmailCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Add an email to the registration whitelist. Admin only."""
    email = data.email.strip().lower()
    existing = db.query(AllowedEmail).filter(AllowedEmail.email == email).first()
    if existing:
        raise HTTPException(400, "Email is already in the whitelist")
    entry = AllowedEmail(email=email, notes=data.notes, added_by_id=current_admin.id)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=200)
def remove_allowed_email(
    entry_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Remove an email from the registration whitelist. Admin only."""
    entry = db.query(AllowedEmail).filter(AllowedEmail.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Email entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Email removed from whitelist"}
