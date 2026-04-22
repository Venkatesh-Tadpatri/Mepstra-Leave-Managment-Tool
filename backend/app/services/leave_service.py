from sqlalchemy.orm import Session
from sqlalchemy import and_, extract
from datetime import date, datetime, timedelta
from app.models.models import LeaveRequest, LeaveBalance, LeaveStatus, LeaveType, User, UserRole, Holiday, HolidayType, EmergencyLeaveOverride, SpecialLeaveCredit
from app.schemas.schemas import LeaveRequestCreate
from typing import Optional

# Max casual leave days that carry forward to next year
CARRY_FORWARD_MAX_DAYS = 7

WEEKEND_WORK_PREFIX = "weekend work request:"


def is_working_saturday(d: date) -> bool:
    """2nd and 4th Saturdays of the month are working days."""
    return ((d.day - 1) // 7 + 1) % 2 == 0


def get_working_days(start: date, end: date, db: Session) -> float:
    holidays = db.query(Holiday).filter(
        Holiday.date.between(start, end),
        Holiday.holiday_type == HolidayType.MANDATORY
    ).all()
    holiday_dates = {h.date for h in holidays}

    count = 0.0
    current = start
    while current <= end:
        is_sunday = current.weekday() == 6
        is_saturday = current.weekday() == 5
        working_sat = is_saturday and is_working_saturday(current)
        if not is_sunday and (not is_saturday or working_sat) and current not in holiday_dates:
            count += 1
        current += timedelta(days=1)
    return count


def get_weekend_days(start: date, end: date) -> float:
    count = 0.0
    current = start
    while current <= end:
        if current.weekday() >= 5:
            count += 1
        current += timedelta(days=1)
    return count


def has_weekday_in_range(start: date, end: date) -> bool:
    current = start
    while current <= end:
        if current.weekday() < 5:
            return True
        current += timedelta(days=1)
    return False


def get_or_create_balance(
    user_id: int,
    year: int,
    db: Session,
    casual_total: float = 12.0,
    sick_total: float = 6.0,
    optional_total: float = 2.0,
) -> LeaveBalance:
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.user_id == user_id,
        LeaveBalance.year == year
    ).first()
    if not balance:
        # Check for carry-forward from previous year
        prev_balance = db.query(LeaveBalance).filter(
            LeaveBalance.user_id == user_id,
            LeaveBalance.year == year - 1
        ).first()

        carried_forward = 0.0
        if prev_balance:
            prev_remaining = max(0.0, prev_balance.casual_total - prev_balance.casual_used)
            carried_forward = min(prev_remaining, float(CARRY_FORWARD_MAX_DAYS))

        balance = LeaveBalance(
            user_id=user_id,
            year=year,
            casual_total=casual_total + carried_forward,
            sick_total=sick_total,
            optional_total=optional_total,
        )
        db.add(balance)
        db.commit()
        db.refresh(balance)
    return balance


def get_special_leave_available(user_id: int, year: int, balance: LeaveBalance, db: Session) -> float:
    """Return special leave days available to avail.
    Only credits where work_date (actual day worked) is >= 15 days ago are eligible.
    Falls back to earned_date for legacy rows without work_date.
    """
    cutoff = date.today() - timedelta(days=15)
    all_credits = db.query(SpecialLeaveCredit).filter(
        SpecialLeaveCredit.user_id == user_id,
        SpecialLeaveCredit.year == year,
    ).all()
    total_eligible = sum(
        c.days for c in all_credits
        if (c.work_date or c.earned_date) <= cutoff
    )
    available = max(0.0, total_eligible - balance.special_used)
    return available


def has_emergency_override_today(user_id: int, db: Session) -> bool:
    return db.query(EmergencyLeaveOverride).filter(
        EmergencyLeaveOverride.user_id == user_id,
        EmergencyLeaveOverride.override_date == date.today()
    ).first() is not None


def check_leave_availability(balance: LeaveBalance, leave_type: LeaveType, days: float, db: Session = None) -> tuple[bool, str]:
    if leave_type == LeaveType.LOP:
        # LOP is always available (no balance limit in practice)
        return True, ""
    if leave_type == LeaveType.SPECIAL:
        # For compensatory leave, only credits earned >= 15 days ago are eligible
        if db is not None:
            available = get_special_leave_available(balance.user_id, balance.year, balance, db)
        else:
            available = max(0.0, balance.special_total - balance.special_used)
        if days > available:
            cutoff_days = 15
            return False, (
                f"Insufficient eligible Special leave. "
                f"You have {available} day(s) available (special leave can be availed only {cutoff_days} days after it is earned). "
                f"Requested: {days}"
            )
        return True, ""
    checks = {
        LeaveType.CASUAL:    (balance.casual_total    - balance.casual_used,    "Casual"),
        LeaveType.SICK:      (balance.sick_total      - balance.sick_used,      "Sick"),
        LeaveType.OPTIONAL:  (balance.optional_total  - balance.optional_used,  "Optional"),
        LeaveType.MATERNITY: (balance.maternity_total - balance.maternity_used, "Maternity"),
        LeaveType.PATERNITY: (balance.paternity_total - balance.paternity_used, "Paternity"),
    }
    available, label = checks.get(leave_type, (0, "Unknown"))
    if days > available:
        return False, f"Insufficient {label} leave balance. Available: {available}, Requested: {days}"
    return True, ""


def validate_advance_notice(leave_type: LeaveType, start_date: date, total_days: float, urgent: bool, emergency_override: bool = False) -> tuple[bool, str]:
    """
    Casual leave advance notice rules:
    - 1-day casual: apply at least 7 days (1 week) in advance
    - 2+ day casual: apply at least 14 days (2 weeks) in advance
    - urgent flag allows bypass (manager override up to 1 day prior)
    """
    if leave_type != LeaveType.CASUAL:
        return True, ""
    if emergency_override:
        return True, ""

    today = date.today()
    days_until_start = (start_date - today).days

    if total_days <= 1:
        required_days = 7
    else:
        required_days = 14

    if days_until_start < required_days:
        if urgent and days_until_start >= 1:
            # Manager override: allowed if at least 1 day prior
            return True, ""
        if days_until_start < 1:
            return False, (
                f"Casual leave must be applied at least 1 day in advance. "
                f"Cannot apply for today or past dates."
            )
        return False, (
            f"Casual leave of {total_days} day(s) must be applied at least "
            f"{required_days} days in advance. "
            f"You have only {days_until_start} day(s). "
            f"Mark as 'Urgent' if manager has approved an exception."
        )
    return True, ""


def is_manager_on_leave(manager_id: int, start_date: date, end_date: date, db: Session) -> bool:
    """Check if the manager has an approved leave overlapping with the given dates."""
    overlapping = db.query(LeaveRequest).filter(
        LeaveRequest.user_id == manager_id,
        LeaveRequest.status == LeaveStatus.APPROVED,
        LeaveRequest.start_date <= end_date,
        LeaveRequest.end_date >= start_date,
    ).first()
    return overlapping is not None


def get_admin_user(db: Session) -> Optional[User]:
    """Return the first active Admin user."""
    return db.query(User).filter(
        User.role == UserRole.ADMIN,
        User.is_active == True
    ).first()


def deduct_leave(balance: LeaveBalance, leave_type: LeaveType, days: float):
    if leave_type == LeaveType.CASUAL:
        balance.casual_used += days
    elif leave_type == LeaveType.SICK:
        balance.sick_used += days
    elif leave_type == LeaveType.OPTIONAL:
        balance.optional_used += days
    elif leave_type == LeaveType.MATERNITY:
        balance.maternity_used += days
    elif leave_type == LeaveType.PATERNITY:
        balance.paternity_used += days
    elif leave_type == LeaveType.SPECIAL:
        balance.special_used += days
    elif leave_type == LeaveType.LOP:
        balance.lop_used += days


def restore_leave(balance: LeaveBalance, leave_type: LeaveType, days: float):
    if leave_type == LeaveType.CASUAL:
        balance.casual_used = max(0, balance.casual_used - days)
    elif leave_type == LeaveType.SICK:
        balance.sick_used = max(0, balance.sick_used - days)
    elif leave_type == LeaveType.OPTIONAL:
        balance.optional_used = max(0, balance.optional_used - days)
    elif leave_type == LeaveType.MATERNITY:
        balance.maternity_used = max(0, balance.maternity_used - days)
    elif leave_type == LeaveType.PATERNITY:
        balance.paternity_used = max(0, balance.paternity_used - days)
    elif leave_type == LeaveType.SPECIAL:
        balance.special_used = max(0, balance.special_used - days)
    elif leave_type == LeaveType.LOP:
        balance.lop_used = max(0, balance.lop_used - days)


def create_leave_request(user_id: int, data: LeaveRequestCreate, db: Session):
    today = date.today()
    is_weekend_work_request = (
        data.leave_type == LeaveType.SPECIAL
        and (data.reason or "").strip().lower().startswith(WEEKEND_WORK_PREFIX)
    )
    emergency_override_active = has_emergency_override_today(user_id, db)

    # Sick leave: allow retroactive applications (past dates)
    # Other types: only allow today or future (unless retroactive flag)
    if data.leave_type != LeaveType.SICK and not is_weekend_work_request and not data.is_retroactive and not emergency_override_active:
        if data.start_date < today:
            raise ValueError("Leave start date cannot be in the past. For sick leave applied after return, use the retroactive option.")

    if is_weekend_work_request:
        if has_weekday_in_range(data.start_date, data.end_date):
            raise ValueError("Weekend work request must include only Saturday/Sunday dates.")
        total_days = get_weekend_days(data.start_date, data.end_date)
        if data.half_day:
            if data.start_date != data.end_date:
                raise ValueError("Half-day weekend request can be applied for a single date only.")
            total_days = 0.5
        if total_days <= 0:
            raise ValueError("Select at least one weekend day for weekend work request.")
    elif data.leave_type in (LeaveType.MATERNITY, LeaveType.PATERNITY):
        # Maternity/Paternity counts all calendar days including weekends & holidays
        total_days = (data.end_date - data.start_date).days + 1
    else:
        total_days = get_working_days(data.start_date, data.end_date, db)
        if data.half_day:
            total_days = 0.5

    # Advance notice validation for casual leave
    ok_notice, notice_msg = validate_advance_notice(
        data.leave_type, data.start_date, total_days, data.urgent, emergency_override_active
    )
    if not ok_notice:
        raise ValueError(notice_msg)

    # Optional leave: must be on a declared optional holiday date
    if data.leave_type == LeaveType.OPTIONAL:
        if data.start_date != data.end_date:
            raise ValueError("Optional leave must be a single-day request — select one optional holiday.")
        optional_holiday = db.query(Holiday).filter(
            Holiday.date == data.start_date,
            Holiday.holiday_type == HolidayType.OPTIONAL,
        ).first()
        if not optional_holiday:
            raise ValueError(
                f"{data.start_date} is not a declared optional holiday. "
                "Optional leave can only be taken on the optional holidays listed in the company calendar."
            )

    # Check for overlapping leave on the same dates (pending or already approved)
    if not is_weekend_work_request:
        overlap = db.query(LeaveRequest).filter(
            LeaveRequest.user_id == user_id,
            LeaveRequest.status.in_([LeaveStatus.PENDING, LeaveStatus.APPROVED, LeaveStatus.APPROVED_BY_MANAGER]),
            LeaveRequest.start_date <= data.end_date,
            LeaveRequest.end_date >= data.start_date,
        ).first()
        if overlap:
            raise ValueError(
                f"You already have a {overlap.status.value.replace('_', ' ')} "
                f"{overlap.leave_type.value} leave from {overlap.start_date} to {overlap.end_date} "
                f"overlapping the selected dates."
            )

    if not is_weekend_work_request:
        year = data.start_date.year
        balance = get_or_create_balance(user_id, year, db)
        ok, msg = check_leave_availability(balance, data.leave_type, total_days, db)
        if not ok:
            raise ValueError(msg)

    user = db.query(User).filter(User.id == user_id).first()

    # Manager and HR leave requests must be approved by Admin.
    if user.role in [UserRole.MANAGER, UserRole.HR]:
        admin = get_admin_user(db)
        if not admin:
            raise ValueError("No active admin user available for approval routing.")
        approver_id = admin.id
    else:
        # Default approver is assigned manager; if manager is on leave, route to Admin.
        approver_id = user.manager_id
        if approver_id and is_manager_on_leave(approver_id, data.start_date, data.end_date, db):
            admin = get_admin_user(db)
            if admin:
                approver_id = admin.id

    leave = LeaveRequest(
        user_id=user_id,
        leave_type=data.leave_type,
        start_date=data.start_date,
        end_date=data.end_date,
        total_days=total_days,
        reason=data.reason,
        half_day=data.half_day,
        half_day_type=data.half_day_type,
        is_retroactive=data.is_retroactive,
        urgent=data.urgent,
        manager_id=approver_id,
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave
