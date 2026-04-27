from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.schemas import Token, LoginRequest, UserCreate, UserResponse, OTPSendRequest, OTPVerifyRequest
from app.models.models import User, UserRole, AllowedEmail, RegistrationOTP
from app.models.models import Department
from app.core.security import verify_password, get_password_hash, create_access_token
from app.services.leave_service import get_or_create_balance
from app.services.email_service import send_otp_email
from datetime import date, datetime, timedelta
import secrets
import logging
from sqlalchemy import or_

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

OTP_EXPIRY_SECONDS = 120  # 2 minutes


def _generate_otp() -> str:
    return str(secrets.randbelow(900000) + 100000)  # 6-digit OTP


def _utcnow() -> datetime:
    return datetime.utcnow()


def _email_candidates(email: str) -> list[str]:
    normalized = email.lower().strip()
    candidates = [normalized]

    if normalized.endswith("@mepstra.com"):
        candidates.append(normalized.replace("@mepstra.com", "@mepstra.com"))
    elif normalized.endswith("@mepstra.com"):
        candidates.append(normalized.replace("@mepstra.com", "@mepstra.com"))

    # Preserve order while removing duplicates.
    return list(dict.fromkeys(candidates))


def authenticate_user(email: str, password: str, db: Session):
    candidates = _email_candidates(email)
    user = db.query(User).filter(or_(*(User.email == candidate for candidate in candidates))).first()
    if not user:
        normalized = email.strip().lower()
        # Check if this email is in the whitelist but hasn't registered yet
        in_whitelist = db.query(AllowedEmail).filter(
            or_(AllowedEmail.outlook_email == normalized, AllowedEmail.gmail == normalized)
        ).first()
        if in_whitelist:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="ACCOUNT_NOT_FOUND"
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="EMAIL_NOT_REGISTERED"
        )
    if not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or PIN")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")
    return user


@router.post("/login", response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(data.email, data.password, db)
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return Token(access_token=token, token_type="bearer", user=user)


@router.post("/token", response_model=Token, include_in_schema=False)
def login_swagger(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 form login — used by Swagger UI Authorize button."""
    user = authenticate_user(form.username, form.password, db)
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return Token(access_token=token, token_type="bearer", user=user)


@router.post("/send-otp", status_code=200)
def send_otp(data: OTPSendRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Send a 6-digit OTP to the given email for registration verification."""
    email = data.email.strip().lower()

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # If whitelist is non-empty, only pre-approved emails may register
    allowed_count = db.query(AllowedEmail).count()
    if allowed_count > 0:
        allowed = db.query(AllowedEmail).filter(
            or_(AllowedEmail.outlook_email == email, AllowedEmail.gmail == email)
        ).first()
        if not allowed:
            raise HTTPException(
                status_code=400,
                detail="This email is not registered in the company database. Please contact your administrator to get added."
            )
        # Block if the other email for the same employee is already registered
        other = allowed.gmail if allowed.outlook_email == email else allowed.outlook_email
        if other and db.query(User).filter(User.email == other).first():
            raise HTTPException(
                status_code=400,
                detail="An account already exists for this employee. Each employee can only register once.",
            )

    otp = _generate_otp()
    expires_at = _utcnow() + timedelta(seconds=OTP_EXPIRY_SECONDS)
    otp_record = db.query(RegistrationOTP).filter(RegistrationOTP.email == email).first()
    if otp_record:
        otp_record.otp = otp
        otp_record.expires_at = expires_at
        otp_record.verified_at = None
        otp_record.attempts = 0
    else:
        db.add(RegistrationOTP(
            email=email,
            otp=otp,
            expires_at=expires_at,
            verified_at=None,
            attempts=0,
        ))
    db.commit()

    # Send email in background — response returns immediately, no waiting for SMTP
    background_tasks.add_task(send_otp_email, email, otp)

    # Always log OTP to console for development convenience
    logger.info("OTP for %s: %s", email, otp)
    print(f"\n>>> OTP for {email}: {otp} (valid 2 min) <<<\n")

    return {"message": "OTP sent to your email address", "expires_in_seconds": OTP_EXPIRY_SECONDS}


@router.post("/verify-otp", status_code=200)
def verify_otp(data: OTPVerifyRequest, db: Session = Depends(get_db)):
    """Verify OTP before completing registration."""
    email = data.email.strip().lower()
    record = db.query(RegistrationOTP).filter(RegistrationOTP.email == email).first()
    if not record:
        raise HTTPException(status_code=400, detail="No OTP found for this email. Please request a new one.")
    if _utcnow() > record.expires_at:
        db.delete(record)
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    if record.otp != data.otp.strip():
        record.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")

    record.verified_at = _utcnow()
    db.commit()
    return {"message": "OTP verified successfully. You may now complete registration."}


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    email = data.email.strip().lower()

    otp_record = db.query(RegistrationOTP).filter(RegistrationOTP.email == email).first()
    if not otp_record:
        raise HTTPException(status_code=400, detail="Please request and verify an OTP before registration.")
    if _utcnow() > otp_record.expires_at:
        db.delete(otp_record)
        db.commit()
        raise HTTPException(status_code=400, detail="OTP session expired. Please request a new OTP.")
    if not otp_record.verified_at:
        raise HTTPException(status_code=400, detail="Email OTP not verified. Please verify your OTP first.")

    # Check against allowed email whitelist (if the list is non-empty, only those emails may register)
    whitelist_entry = None
    allowed_count = db.query(AllowedEmail).count()
    if allowed_count > 0:
        whitelist_entry = db.query(AllowedEmail).filter(
            or_(AllowedEmail.outlook_email == email, AllowedEmail.gmail == email)
        ).first()
        if not whitelist_entry:
            raise HTTPException(
                status_code=400,
                detail="Your email is not in the approved registration list. Please contact the administrator."
            )
        # Block if the other email for the same employee is already registered
        other = whitelist_entry.gmail if whitelist_entry.outlook_email == email else whitelist_entry.outlook_email
        if other and db.query(User).filter(User.email == other).first():
            raise HTTPException(
                status_code=400,
                detail="An account already exists for this employee. Each employee can only register once.",
            )

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    department = None
    if data.department_id:
        department = db.query(Department).filter(Department.id == data.department_id).first()
        if not department:
            raise HTTPException(status_code=400, detail="Selected department does not exist")
        if data.business_unit and department.business_unit != data.business_unit:
            raise HTTPException(status_code=400, detail="Selected department does not belong to the chosen business unit")

    # If registering as manager, assign Admin as reporting manager by default.
    assigned_manager_id = data.manager_id
    if data.role == UserRole.MANAGER:
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN, User.is_active == True).first()
        if not admin_user:
            raise HTTPException(status_code=400, detail="No active admin user available for manager assignment")
        assigned_manager_id = admin_user.id

    user = User(
        email=email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        phone=data.phone,
        role=data.role,
        employment_type=data.employment_type,
        business_unit=data.business_unit,
        department_id=department.id if department else None,
        manager_id=assigned_manager_id,
        team_lead_id=data.team_lead_id,
        hr_id=data.hr_id,
        joining_date=data.joining_date,
        date_of_birth=data.date_of_birth,
        gender=data.gender,
        marital_status=data.marital_status,
        marriage_date=data.marriage_date,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    get_or_create_balance(
        user.id,
        date.today().year,
        db,
        casual_total=whitelist_entry.casual_leaves if whitelist_entry else 12.0,
        sick_total=whitelist_entry.sick_leaves if whitelist_entry else 6.0,
        optional_total=whitelist_entry.optional_leaves if whitelist_entry else 2.0,
    )

    # Link whitelist entry to the registered user for future balance syncs
    if whitelist_entry:
        whitelist_entry.registered_user_id = user.id
        db.commit()

    db.delete(otp_record)
    db.commit()

    return user
