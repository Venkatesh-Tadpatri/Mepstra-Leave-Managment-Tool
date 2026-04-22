from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, Text,
    ForeignKey, Enum as SAEnum, Float
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum


class UserRole(str, enum.Enum):
    EMPLOYEE = "employee"
    TEAM_LEAD = "team_lead"
    MANAGER = "manager"
    HR = "hr"
    MAIN_MANAGER = "main_manager"
    ADMIN = "admin"


class EmploymentType(str, enum.Enum):
    INTERN = "intern"
    PERMANENT = "permanent"
    CONTRACT = "contract"


class BusinessUnit(str, enum.Enum):
    MEPSTRA_POWER_SOLUTIONS = "mepstra_power_solutions"
    MEPSTRA_ENGINEERING_CONSULTANCY = "mepstra_engineering_consultancy"


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class MaritalStatus(str, enum.Enum):
    SINGLE = "single"
    MARRIED = "married"


class LeaveType(str, enum.Enum):
    CASUAL = "casual"
    SICK = "sick"
    OPTIONAL = "optional"
    MATERNITY = "maternity"
    PATERNITY = "paternity"
    SPECIAL = "special"   # weekend work compensation
    LOP = "lop"           # leave without pay


class LeaveStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED_BY_MANAGER = "approved_by_manager"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class HolidayType(str, enum.Enum):
    MANDATORY = "mandatory"
    OPTIONAL = "optional"


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    business_unit = Column(SAEnum(BusinessUnit), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="department")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(SAEnum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    employment_type = Column(SAEnum(EmploymentType), nullable=True)
    business_unit = Column(SAEnum(BusinessUnit), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    team_lead_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    hr_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    joining_date = Column(Date, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(SAEnum(Gender), nullable=True)
    marital_status = Column(SAEnum(MaritalStatus), nullable=True)
    marriage_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    profile_image = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    department = relationship("Department", back_populates="users")
    manager = relationship("User", foreign_keys=[manager_id], remote_side="User.id", backref="direct_reports")
    team_lead = relationship("User", foreign_keys=[team_lead_id], remote_side="User.id")
    hr = relationship("User", foreign_keys=[hr_id], remote_side="User.id")
    leave_balances = relationship("LeaveBalance", back_populates="user", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", foreign_keys="LeaveRequest.user_id", back_populates="user", cascade="all, delete-orphan")


class EmergencyLeaveOverride(Base):
    __tablename__ = "emergency_leave_overrides"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    override_date = Column(Date, nullable=False, index=True)  # valid for this day only
    enabled_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    year = Column(Integer, nullable=False)
    casual_total = Column(Float, default=12.0)
    casual_used = Column(Float, default=0.0)
    sick_total = Column(Float, default=6.0)
    sick_used = Column(Float, default=0.0)
    optional_total = Column(Float, default=2.0)
    optional_used = Column(Float, default=0.0)
    maternity_total = Column(Float, default=90.0)
    maternity_used = Column(Float, default=0.0)
    paternity_total = Column(Float, default=5.0)
    paternity_used = Column(Float, default=0.0)
    special_total = Column(Float, default=0.0)   # earned per weekend worked
    special_used = Column(Float, default=0.0)
    lop_total = Column(Float, default=365.0)     # LOP has no practical limit
    lop_used = Column(Float, default=0.0)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="leave_balances")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    leave_type = Column(SAEnum(LeaveType), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_days = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(SAEnum(LeaveStatus), default=LeaveStatus.PENDING)
    half_day = Column(Boolean, default=False)
    half_day_type = Column(String(10), nullable=True)  # "morning" or "afternoon"
    is_retroactive = Column(Boolean, default=False)    # sick leave applied after return
    urgent = Column(Boolean, default=False)            # bypass advance notice rule
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    manager_action = Column(String(20), nullable=True)
    manager_comment = Column(Text, nullable=True)
    manager_action_at = Column(DateTime(timezone=True), nullable=True)
    main_manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    main_manager_action = Column(String(20), nullable=True)
    main_manager_comment = Column(Text, nullable=True)
    main_manager_action_at = Column(DateTime(timezone=True), nullable=True)
    hr_notified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id], back_populates="leave_requests")
    manager = relationship("User", foreign_keys=[manager_id])
    main_manager = relationship("User", foreign_keys=[main_manager_id])


class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    date = Column(Date, nullable=False, unique=True)
    holiday_type = Column(SAEnum(HolidayType), default=HolidayType.MANDATORY)
    description = Column(Text, nullable=True)
    year = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AllowedEmail(Base):
    """Whitelist of email addresses permitted to register — one row per employee."""
    __tablename__ = "allowed_emails"

    id = Column(Integer, primary_key=True, index=True)
    employee_name = Column(String(255), nullable=False)
    outlook_email = Column(String(255), unique=True, nullable=True, index=True)
    gmail = Column(String(255), unique=True, nullable=True, index=True)
    email = Column(String(255), nullable=True)   # legacy column — kept so existing rows are not lost
    notes = Column(String(255), nullable=True)
    casual_leaves = Column(Float, default=12.0)
    sick_leaves = Column(Float, default=6.0)
    optional_leaves = Column(Float, default=2.0)
    added_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    registered_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WFHStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class WorkFromHomeRequest(Base):
    """Work-from-home request submitted by an employee, approved by their manager."""
    __tablename__ = "wfh_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_days = Column(Float, nullable=False, default=1.0)
    reason = Column(Text, nullable=False)
    status = Column(SAEnum(WFHStatus), default=WFHStatus.PENDING, nullable=False)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    manager_comment = Column(Text, nullable=True)
    manager_action_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])
    manager = relationship("User", foreign_keys=[manager_id])


class SpecialLeaveCredit(Base):
    """Tracks each batch of special (compensatory) leave credits earned by working weekends/holidays."""
    __tablename__ = "special_leave_credits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    days = Column(Float, nullable=False)
    work_date = Column(Date, nullable=True)       # actual date(s) the employee worked (start_date of the request)
    earned_date = Column(Date, nullable=False)    # date the request was approved (credit recorded)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
