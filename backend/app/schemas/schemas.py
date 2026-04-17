from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional, List
from datetime import date, datetime
from app.models.models import UserRole, LeaveType, LeaveStatus, HolidayType, EmploymentType, BusinessUnit, Gender, MaritalStatus
import re


def _is_company_email(email: str) -> bool:
    return bool(re.match(r"^[^@]+@(mepstra|mepstra)\.com$", email))


def _is_allowed_gmail(email: str) -> bool:
    if not re.match(r"^[^@]+@gmail\.com$", email):
        return False

    username = email.split("@")[0]
    return "mepstra" in username.lower() or "mepstra" in username.lower()


# ─── Auth ───────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"


class LoginRequest(BaseModel):
    email: str
    password: str


# ─── OTP ────────────────────────────────────────────────
class OTPSendRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if _is_company_email(v):
            return v
        if _is_allowed_gmail(v):
            return v
        raise ValueError("Only @mepstra.com, @mepstra.com, or Gmail IDs containing 'mepstra'/'mepstra' are allowed")


class OTPVerifyRequest(BaseModel):
    email: str
    otp: str


# ─── Department ─────────────────────────────────────────
class DepartmentCreate(BaseModel):
    name: str
    business_unit: BusinessUnit
    description: Optional[str] = None


class DepartmentResponse(BaseModel):
    id: int
    name: str
    business_unit: BusinessUnit
    description: Optional[str] = None

    model_config = {"from_attributes": True}


# ─── User ────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str          # 4-digit PIN
    phone: Optional[str] = None
    role: UserRole = UserRole.EMPLOYEE
    employment_type: Optional[EmploymentType] = None
    business_unit: Optional[BusinessUnit] = None
    department_id: Optional[int] = None
    manager_id: Optional[int] = None
    team_lead_id: Optional[int] = None
    hr_id: Optional[int] = None
    joining_date: Optional[date] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    marital_status: Optional[MaritalStatus] = None
    marriage_date: Optional[date] = None
    otp_code: Optional[str] = None   # required when OTP verification is enabled

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if _is_company_email(v):
            return v
        if _is_allowed_gmail(v):
            return v
        raise ValueError("Only @mepstra.com, @mepstra.com, or Gmail IDs containing 'mepstra'/'mepstra' are allowed")

    @field_validator("password")
    @classmethod
    def validate_pin(cls, v: str) -> str:
        if not re.match(r"^\d{4}$", v):
            raise ValueError("PIN must be exactly 4 digits (numbers only)")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    employment_type: Optional[EmploymentType] = None
    business_unit: Optional[BusinessUnit] = None
    department_id: Optional[int] = None
    manager_id: Optional[int] = None
    team_lead_id: Optional[int] = None
    hr_id: Optional[int] = None
    joining_date: Optional[date] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    marital_status: Optional[MaritalStatus] = None
    marriage_date: Optional[date] = None
    is_active: Optional[bool] = None


class ResetPasswordRequest(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_pin(cls, v: str) -> str:
        if not re.match(r"^\d{4}$", v):
            raise ValueError("PIN must be exactly 4 digits (numbers only)")
        return v


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    employment_type: Optional[EmploymentType] = None
    business_unit: Optional[BusinessUnit] = None
    department_id: Optional[int] = None
    manager_id: Optional[int] = None
    team_lead_id: Optional[int] = None
    hr_id: Optional[int] = None
    joining_date: Optional[date] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    marital_status: Optional[MaritalStatus] = None
    marriage_date: Optional[date] = None
    is_active: bool
    profile_image: Optional[str] = None
    created_at: datetime
    department: Optional[DepartmentResponse] = None

    model_config = {"from_attributes": True}


class UserSummary(BaseModel):
    id: int
    full_name: str
    email: str
    role: UserRole
    profile_image: Optional[str] = None
    department: Optional[DepartmentResponse] = None

    model_config = {"from_attributes": True}


# ─── Leave Balance ───────────────────────────────────────
class LeaveBalanceResponse(BaseModel):
    id: int
    user_id: int
    year: int
    casual_total: float
    casual_used: float
    sick_total: float
    sick_used: float
    optional_total: float
    optional_used: float
    maternity_total: float
    maternity_used: float
    paternity_total: float
    paternity_used: float
    special_total: float
    special_used: float
    lop_total: float
    lop_used: float

    model_config = {"from_attributes": True}


# ─── Leave Request ───────────────────────────────────────
class LeaveRequestCreate(BaseModel):
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str
    half_day: bool = False
    half_day_type: Optional[str] = None
    is_retroactive: bool = False   # for sick leave applied after returning
    urgent: bool = False           # bypass advance notice (with justification)

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v, info):
        if info.data.get("start_date") and v < info.data["start_date"]:
            raise ValueError("end_date must be >= start_date")
        return v


class LeaveRequestUpdate(BaseModel):
    action: str  # "approve" | "reject"
    comment: Optional[str] = None


class LeaveRequestResponse(BaseModel):
    id: int
    user_id: int
    leave_type: LeaveType
    start_date: date
    end_date: date
    total_days: float
    reason: str
    status: LeaveStatus
    half_day: bool
    half_day_type: Optional[str] = None
    is_retroactive: bool = False
    urgent: bool = False
    manager_comment: Optional[str] = None
    manager_action_at: Optional[datetime] = None
    main_manager_comment: Optional[str] = None
    main_manager_action_at: Optional[datetime] = None
    created_at: datetime
    user: Optional[UserSummary] = None
    manager: Optional[UserSummary] = None

    model_config = {"from_attributes": True}


# ─── Holiday ─────────────────────────────────────────────
class HolidayCreate(BaseModel):
    name: str
    date: date
    holiday_type: HolidayType = HolidayType.MANDATORY
    description: Optional[str] = None
    year: int


class HolidayResponse(BaseModel):
    id: int
    name: str
    date: date
    holiday_type: HolidayType
    description: Optional[str] = None
    year: int

    model_config = {"from_attributes": True}


# ─── Dashboard ───────────────────────────────────────────
class DashboardStats(BaseModel):
    total_employees: int
    pending_requests: int
    approved_today: int
    on_leave_today: int
    leave_summary: dict
    department_wise: List[dict]
    monthly_trend: List[dict]


# ─── Allowed Emails ──────────────────────────────────────
# ─── Work From Home ──────────────────────────────────────
class WFHCreate(BaseModel):
    start_date: date
    end_date: date
    reason: str

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v, info):
        if info.data.get("start_date") and v < info.data["start_date"]:
            raise ValueError("end_date must be >= start_date")
        return v


class WFHUpdate(BaseModel):
    action: str   # "approve" | "reject"
    comment: Optional[str] = None


class WFHResponse(BaseModel):
    id: int
    user_id: int
    start_date: date
    end_date: date
    total_days: float
    reason: str
    status: str
    manager_comment: Optional[str] = None
    manager_action_at: Optional[datetime] = None
    created_at: datetime
    user: Optional[UserSummary] = None
    manager: Optional[UserSummary] = None

    model_config = {"from_attributes": True}


class AllowedEmailCreate(BaseModel):
    employee_name: str
    outlook_email: Optional[str] = None
    gmail: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("outlook_email", "gmail", mode="before")
    @classmethod
    def normalize_email_field(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().lower() if v and v.strip() else None

    @field_validator("employee_name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Employee name is required")
        return v

    @model_validator(mode="after")
    def at_least_one_email(self) -> "AllowedEmailCreate":
        if not self.outlook_email and not self.gmail:
            raise ValueError("At least one email (Outlook or Gmail) is required")
        return self


class AllowedEmailUpdate(BaseModel):
    outlook_email: Optional[str] = None
    gmail: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("outlook_email", "gmail", mode="before")
    @classmethod
    def normalize_email_field(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().lower() if v and v.strip() else None


class AllowedEmailResponse(BaseModel):
    id: int
    employee_name: str
    outlook_email: Optional[str] = None
    gmail: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
