from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_
from datetime import date
from calendar import monthrange
from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, LeaveRequest, LeaveBalance, LeaveStatus, Department, UserRole
from app.schemas.schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    is_manager_view = current_user.role in [UserRole.MANAGER, UserRole.TEAM_LEAD]

    managed_users_q = db.query(User).filter(User.is_active == True, User.role == UserRole.EMPLOYEE)
    if current_user.role == UserRole.MANAGER:
        managed_users_q = managed_users_q.filter(User.manager_id == current_user.id)
    elif current_user.role == UserRole.TEAM_LEAD:
        managed_users_q = managed_users_q.filter(User.team_lead_id == current_user.id)

    managed_user_ids = [u.id for u in managed_users_q.all()]

    if is_manager_view:
        total_employees = len(managed_user_ids)
        pending_requests = (
            db.query(LeaveRequest)
            .join(User, LeaveRequest.user_id == User.id)
            .filter(
                User.manager_id == current_user.id,
                LeaveRequest.status == LeaveStatus.PENDING
            )
            .count()
        )
        on_leave_today = db.query(LeaveRequest).filter(
            LeaveRequest.user_id.in_(managed_user_ids),
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= today,
            LeaveRequest.status == LeaveStatus.APPROVED
        ).count()
        approved_today = db.query(LeaveRequest).filter(
            LeaveRequest.user_id.in_(managed_user_ids),
            func.date(LeaveRequest.manager_action_at) == today,
            or_(
                LeaveRequest.status == LeaveStatus.APPROVED,
                LeaveRequest.status == LeaveStatus.APPROVED_BY_MANAGER,
            )
        ).count()
    else:
        total_employees = db.query(User).filter(User.is_active == True).count()
        pending_requests = db.query(LeaveRequest).filter(
            LeaveRequest.status == LeaveStatus.PENDING
        ).count()
        on_leave_today = db.query(LeaveRequest).filter(
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= today,
            LeaveRequest.status == LeaveStatus.APPROVED
        ).count()
        approved_today = db.query(LeaveRequest).filter(
            func.date(LeaveRequest.main_manager_action_at) == today,
            LeaveRequest.status == LeaveStatus.APPROVED
        ).count()

    # leave type summary for current year
    year = today.year
    balances_q = db.query(LeaveBalance).filter(LeaveBalance.year == year)
    if is_manager_view:
        balances_q = balances_q.filter(LeaveBalance.user_id.in_(managed_user_ids))
    balances = balances_q.all()
    leave_summary = {
        "casual": {"total": sum(b.casual_total for b in balances), "used": sum(b.casual_used for b in balances)},
        "sick": {"total": sum(b.sick_total for b in balances), "used": sum(b.sick_used for b in balances)},
        "optional": {"total": sum(b.optional_total for b in balances), "used": sum(b.optional_used for b in balances)},
    }

    # department-wise leaves
    dept_data = []
    departments = db.query(Department).all()
    for dept in departments:
        dept_users = db.query(User).filter(User.department_id == dept.id, User.is_active == True).all()
        if is_manager_view:
            dept_users = [u for u in dept_users if u.id in managed_user_ids]
        user_ids = [u.id for u in dept_users]
        if not user_ids:
            continue
        count = db.query(LeaveRequest).filter(
            LeaveRequest.user_id.in_(user_ids),
            LeaveRequest.status == LeaveStatus.APPROVED,
            extract("year", LeaveRequest.start_date) == year
        ).count()
        dept_data.append({"department": dept.name, "leaves": count})

    # monthly trend (approved leaves per month)
    monthly = []
    for month in range(1, 13):
        monthly_q = db.query(LeaveRequest).filter(
            extract("year", LeaveRequest.start_date) == year,
            extract("month", LeaveRequest.start_date) == month
        )
        if is_manager_view:
            monthly_q = monthly_q.filter(
                LeaveRequest.user_id.in_(managed_user_ids),
                LeaveRequest.status.in_([LeaveStatus.APPROVED, LeaveStatus.APPROVED_BY_MANAGER]),
            )
        else:
            monthly_q = monthly_q.filter(LeaveRequest.status == LeaveStatus.APPROVED)
        count = monthly_q.count()
        monthly.append({"month": month, "count": count})

    return {
        "total_employees": total_employees,
        "pending_requests": pending_requests,
        "approved_today": approved_today,
        "on_leave_today": on_leave_today,
        "leave_summary": leave_summary,
        "department_wise": dept_data,
        "monthly_trend": monthly,
    }


@router.get("/on-leave-today")
def on_leave_today(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    is_manager_view = current_user.role in [UserRole.MANAGER, UserRole.TEAM_LEAD]

    q = (
        db.query(LeaveRequest, User, Department)
        .join(User, LeaveRequest.user_id == User.id)
        .outerjoin(Department, User.department_id == Department.id)
        .filter(
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= today,
            LeaveRequest.status == LeaveStatus.APPROVED,
        )
    )
    if is_manager_view:
        managed_user_ids = [
            u.id for u in db.query(User).filter(
                User.is_active == True,
                User.manager_id == current_user.id if current_user.role == UserRole.MANAGER
                else User.team_lead_id == current_user.id
            ).all()
        ]
        q = q.filter(LeaveRequest.user_id.in_(managed_user_ids))

    results = q.all()
    return [
        {
            "id": leave.id,
            "employee_name": user.full_name,
            "department": dept.name if dept else None,
            "leave_type": leave.leave_type.value,
            "start_date": str(leave.start_date),
            "end_date": str(leave.end_date),
            "total_days": leave.total_days,
        }
        for leave, user, dept in results
    ]


@router.get("/leave-schedule")
def leave_schedule(
    month: int = Query(None),
    year: int = Query(None),
    day: int = Query(None),
    department_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    m = month or today.month
    y = year or today.year

    if day:
        # Filter to a single specific date
        target = date(y, m, day)
        first_day = target
        last_day = target
    else:
        first_day = date(y, m, 1)
        last_day = date(y, m, monthrange(y, m)[1])

    is_manager_view = current_user.role in [UserRole.MANAGER, UserRole.TEAM_LEAD]

    q = (
        db.query(LeaveRequest, User, Department)
        .join(User, LeaveRequest.user_id == User.id)
        .outerjoin(Department, User.department_id == Department.id)
        .filter(
            LeaveRequest.start_date <= last_day,
            LeaveRequest.end_date >= first_day,
            LeaveRequest.status == LeaveStatus.APPROVED,
        )
        .order_by(LeaveRequest.start_date.asc())
    )

    if department_id:
        q = q.filter(User.department_id == department_id)

    if is_manager_view:
        managed_ids = [
            u.id for u in db.query(User).filter(
                User.is_active == True,
                User.manager_id == current_user.id if current_user.role == UserRole.MANAGER
                else User.team_lead_id == current_user.id
            ).all()
        ]
        q = q.filter(LeaveRequest.user_id.in_(managed_ids))

    results = q.all()

    # Collect approver user IDs to fetch in one query
    approver_ids = set()
    for leave, _, _ in results:
        if leave.main_manager_id:
            approver_ids.add(leave.main_manager_id)
        elif leave.manager_id:
            approver_ids.add(leave.manager_id)
    approver_map = {}
    if approver_ids:
        for u in db.query(User).filter(User.id.in_(approver_ids)).all():
            approver_map[u.id] = u

    def _user_summary(u):
        if not u:
            return None
        return {"id": u.id, "full_name": u.full_name, "email": u.email, "role": u.role.value, "profile_image": u.profile_image, "department": None}

    return [
        {
            "id": leave.id,
            "employee_name": user.full_name,
            "department": dept.name if dept else "—",
            "leave_type": leave.leave_type.value,
            "start_date": str(leave.start_date),
            "end_date": str(leave.end_date),
            "total_days": leave.total_days,
            "status": leave.status.value,
            "manager": _user_summary(approver_map.get(leave.manager_id)) if not leave.main_manager_id and leave.manager_id else None,
            "main_manager": _user_summary(approver_map.get(leave.main_manager_id)) if leave.main_manager_id else None,
            "manager_action_at": (leave.manager_action_at.isoformat() + "Z") if leave.manager_action_at else None,
            "main_manager_action_at": (leave.main_manager_action_at.isoformat() + "Z") if leave.main_manager_action_at else None,
        }
        for leave, user, dept in results
    ]


@router.get("/my-stats")
def my_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    year = date.today().year
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.user_id == current_user.id,
        LeaveBalance.year == year
    ).first()

    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.user_id == current_user.id,
        extract("year", LeaveRequest.start_date) == year
    ).all()

    return {
        "balance": balance,
        "total_leaves": len(leaves),
        "approved": len([l for l in leaves if l.status == LeaveStatus.APPROVED]),
        "pending": len([l for l in leaves if l.status == LeaveStatus.PENDING]),
        "rejected": len([l for l in leaves if l.status == LeaveStatus.REJECTED]),
        "recent_leaves": leaves[-5:],
    }


@router.get("/employee-leave-report")
def employee_leave_report(
    year: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.HR]:
        raise HTTPException(status_code=403, detail="Not authorized")

    y = year or date.today().year
    rows = (
        db.query(User, Department, LeaveBalance)
        .outerjoin(Department, User.department_id == Department.id)
        .outerjoin(
            LeaveBalance,
            and_(LeaveBalance.user_id == User.id, LeaveBalance.year == y),
        )
        .filter(User.is_active == True)
        .order_by(User.full_name.asc())
        .all()
    )

    report = []
    for user, department, balance in rows:
        casual_total = balance.casual_total if balance else 12.0
        casual_used = balance.casual_used if balance else 0.0
        sick_total = balance.sick_total if balance else 6.0
        sick_used = balance.sick_used if balance else 0.0
        optional_total = balance.optional_total if balance else 2.0
        optional_used = balance.optional_used if balance else 0.0
        special_total = balance.special_total if balance else 0.0
        special_used = balance.special_used if balance else 0.0
        maternity_total = balance.maternity_total if balance else 45.0
        maternity_used = balance.maternity_used if balance else 0.0
        paternity_total = balance.paternity_total if balance else 5.0
        paternity_used = balance.paternity_used if balance else 0.0
        lop_total = balance.lop_total if balance else 365.0
        lop_used = balance.lop_used if balance else 0.0

        report.append({
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "department": department.name if department else "",
            "year": y,
            "casual_used": casual_used,
            "casual_remaining": max(0.0, casual_total - casual_used),
            "sick_used": sick_used,
            "sick_remaining": max(0.0, sick_total - sick_used),
            "optional_used": optional_used,
            "optional_remaining": max(0.0, optional_total - optional_used),
            "special_used": special_used,
            "special_remaining": max(0.0, special_total - special_used),
            "maternity_used": maternity_used,
            "maternity_remaining": max(0.0, maternity_total - maternity_used),
            "paternity_used": paternity_used,
            "paternity_remaining": max(0.0, paternity_total - paternity_used),
            "lop_used": lop_used,
            "lop_remaining": max(0.0, lop_total - lop_used),
        })

    return {"year": y, "rows": report}
