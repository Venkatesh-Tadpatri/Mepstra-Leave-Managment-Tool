from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import date, datetime
from app.db.database import get_db
from app.api.deps import get_current_user
from app.schemas.schemas import LeaveRequestCreate, LeaveRequestResponse, LeaveRequestUpdate, LeaveBalanceResponse
from app.models.models import LeaveRequest, LeaveBalance, LeaveStatus, LeaveType, User, UserRole, SpecialLeaveCredit
from app.services.leave_service import create_leave_request, get_or_create_balance, deduct_leave, restore_leave
from app.services.email_service import send_leave_request_email, send_leave_status_email, send_admin_approved_manager_notification

router = APIRouter(prefix="/leaves", tags=["Leaves"])

WEEKEND_WORK_PREFIX = "weekend work request:"


def _is_weekend_work_request(leave: LeaveRequest) -> bool:
    return (
        leave.leave_type == LeaveType.SPECIAL
        and (leave.reason or "").strip().lower().startswith(WEEKEND_WORK_PREFIX)
    )


def _credit_special_leave(leave: LeaveRequest, balance: LeaveBalance, db: Session):
    """Credit special leave balance and record a SpecialLeaveCredit for the 15-day avail rule.
    work_date  = the date the employee actually worked (start_date of the weekend request).
    earned_date = the date the credit was approved/granted (today).
    The 15-day cooling period is measured from work_date.
    """
    balance.special_total += leave.total_days
    credit = SpecialLeaveCredit(
        user_id=leave.user_id,
        year=leave.start_date.year,
        days=leave.total_days,
        work_date=leave.start_date,   # actual date worked
        earned_date=date.today(),     # approval date
    )
    db.add(credit)


@router.post("", response_model=LeaveRequestResponse, status_code=201)
def apply_leave(data: LeaveRequestCreate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    try:
        leave = create_leave_request(current_user.id, data, db)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Send email to manager/approver
    if leave.manager_id:
        approver = db.query(User).filter(User.id == leave.manager_id).first()
        if approver:
            send_leave_request_email(
                current_user.full_name, leave.leave_type.value,
                leave.start_date, leave.end_date, leave.total_days,
                leave.reason, approver.email, approver.full_name, leave.id
            )

    # Always notify HR
    if current_user.hr_id:
        hr = db.query(User).filter(User.id == current_user.hr_id).first()
        if hr:
            send_leave_request_email(
                current_user.full_name, leave.leave_type.value,
                leave.start_date, leave.end_date, leave.total_days,
                leave.reason, hr.email, hr.full_name, leave.id
            )
    else:
        # Notify any HR user if employee's HR is not set
        hr_users = db.query(User).filter(User.role == UserRole.HR, User.is_active == True).all()
        for hr in hr_users:
            send_leave_request_email(
                current_user.full_name, leave.leave_type.value,
                leave.start_date, leave.end_date, leave.total_days,
                leave.reason, hr.email, hr.full_name, leave.id
            )

    db.refresh(leave)
    return leave


@router.get("", response_model=List[LeaveRequestResponse])
def get_leaves(
    status: Optional[str] = None,
    year: Optional[int] = None,
    leave_type: Optional[str] = None,
    team: Optional[bool] = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(LeaveRequest)

    if team and current_user.role == UserRole.MANAGER:
        # Manager sees their own leave + all assigned employees' leaves
        managed_ids = [
            u.id for u in db.query(User).filter(
                User.manager_id == current_user.id,
                User.is_active == True
            ).all()
        ]
        q = q.filter(LeaveRequest.user_id.in_([current_user.id] + managed_ids))
    elif team and current_user.role == UserRole.HR:
        pass  # HR sees all leaves
    elif current_user.role in [UserRole.EMPLOYEE, UserRole.TEAM_LEAD, UserRole.MANAGER, UserRole.HR]:
        q = q.filter(LeaveRequest.user_id == current_user.id)
    elif current_user.role in [UserRole.MAIN_MANAGER, UserRole.ADMIN]:
        pass  # sees all

    if status:
        q = q.filter(LeaveRequest.status == status)
    if year:
        q = q.filter(LeaveRequest.start_date.between(date(year, 1, 1), date(year, 12, 31)))
    if leave_type:
        q = q.filter(LeaveRequest.leave_type == leave_type)

    return q.order_by(LeaveRequest.created_at.desc()).all()


@router.get("/pending", response_model=List[LeaveRequestResponse])
def get_pending_approvals(db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    if current_user.role in [UserRole.MANAGER, UserRole.TEAM_LEAD]:
        # Show all PENDING leaves where the employee's assigned manager is current user
        # (regardless of leave routing — admin may have been auto-assigned as approver)
        return (
            db.query(LeaveRequest)
            .join(User, LeaveRequest.user_id == User.id)
            .filter(
                User.manager_id == current_user.id,
                LeaveRequest.status == LeaveStatus.PENDING
            )
            .all()
        )
    elif current_user.role in [UserRole.MAIN_MANAGER, UserRole.ADMIN]:
        # Admin/Main Manager see all pending leaves so they can step in anytime
        return db.query(LeaveRequest).filter(
            LeaveRequest.status == LeaveStatus.PENDING
        ).all()
    elif current_user.role == UserRole.HR:
        # HR view-only: sees all pending
        return db.query(LeaveRequest).filter(
            LeaveRequest.status == LeaveStatus.PENDING
        ).all()
    return []


@router.get("/balance", response_model=LeaveBalanceResponse)
def get_balance(year: Optional[int] = None, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    y = year or date.today().year
    return get_or_create_balance(current_user.id, y, db)


@router.get("/special-credits")
def get_special_credits(year: Optional[int] = None, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    """Return all special leave credits for the current user with cooling-period info."""
    from datetime import timedelta
    y = year or date.today().year
    credits = db.query(SpecialLeaveCredit).filter(
        SpecialLeaveCredit.user_id == current_user.id,
        SpecialLeaveCredit.year == y,
    ).order_by(SpecialLeaveCredit.earned_date).all()
    today = date.today()
    result = []
    for c in credits:
        # Cooling period starts from work_date (when employee actually worked).
        # Fall back to earned_date for legacy rows that predate the work_date column.
        cooling_start = c.work_date if c.work_date else c.earned_date
        available_from = cooling_start + timedelta(days=15)
        result.append({
            "id": c.id,
            "days": c.days,
            "work_date": str(cooling_start),
            "earned_date": str(c.earned_date),
            "available_from": str(available_from),
            "is_eligible": today >= available_from,
        })
    return result


@router.get("/balance/{user_id}", response_model=LeaveBalanceResponse)
def get_user_balance(user_id: int, year: Optional[int] = None,
                     db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.HR, UserRole.MAIN_MANAGER, UserRole.MANAGER]:
        raise HTTPException(403, "Not authorized")
    y = year or date.today().year
    return get_or_create_balance(user_id, y, db)


@router.get("/{leave_id}", response_model=LeaveRequestResponse)
def get_leave(leave_id: int, db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(404, "Leave not found")
    if current_user.role == UserRole.EMPLOYEE and leave.user_id != current_user.id:
        raise HTTPException(403, "Not authorized")
    return leave


@router.put("/{leave_id}/action", response_model=LeaveRequestResponse)
def action_leave(leave_id: int, data: LeaveRequestUpdate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    # HR role is view-only — cannot approve/reject
    if current_user.role == UserRole.HR:
        raise HTTPException(403, "HR has view-only access to leave records")

    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(404, "Leave not found")

    employee = db.query(User).filter(User.id == leave.user_id).first()

    if current_user.role in [UserRole.MANAGER, UserRole.TEAM_LEAD]:
        # Authorize by employee's assigned manager (not leave routing — admin may have been auto-routed)
        if employee.manager_id != current_user.id:
            raise HTTPException(403, "Not your team's leave")
        if leave.status != LeaveStatus.PENDING:
            raise HTTPException(400, "Leave is not pending")
        if data.action == "approve":
            leave.status = LeaveStatus.APPROVED
            balance = get_or_create_balance(leave.user_id, leave.start_date.year, db)
            if _is_weekend_work_request(leave):
                # Weekend work: credit special balance and record earned credit
                _credit_special_leave(leave, balance, db)
            else:
                deduct_leave(balance, leave.leave_type, leave.total_days)
            db.commit()
            send_leave_status_email(
                employee.email, employee.full_name,
                leave.leave_type.value, leave.start_date, leave.end_date,
                leave.total_days, "approved", data.comment or "", leave.reason
            )
            if employee.hr_id:
                hr = db.query(User).filter(User.id == employee.hr_id).first()
                if hr:
                    send_leave_status_email(
                        hr.email, hr.full_name,
                        leave.leave_type.value, leave.start_date, leave.end_date,
                        leave.total_days, "approved", data.comment or "", leave.reason
                    )
        else:
            leave.status = LeaveStatus.REJECTED
            send_leave_status_email(
                employee.email, employee.full_name,
                leave.leave_type.value, leave.start_date, leave.end_date,
                leave.total_days, "rejected", data.comment or "", leave.reason
            )
            if employee.hr_id:
                hr = db.query(User).filter(User.id == employee.hr_id).first()
                if hr:
                    send_leave_status_email(
                        hr.email, hr.full_name,
                        leave.leave_type.value, leave.start_date, leave.end_date,
                        leave.total_days, "rejected", data.comment or "", leave.reason
                    )
        leave.manager_comment = data.comment
        leave.manager_action = data.action
        leave.manager_action_at = datetime.utcnow()

    elif current_user.role in [UserRole.MAIN_MANAGER, UserRole.ADMIN]:
        if leave.status != LeaveStatus.PENDING:
            raise HTTPException(400, "Leave cannot be actioned at this stage")
        if data.action == "approve":
            leave.status = LeaveStatus.APPROVED
            balance = get_or_create_balance(leave.user_id, leave.start_date.year, db)
            if _is_weekend_work_request(leave):
                _credit_special_leave(leave, balance, db)
            else:
                deduct_leave(balance, leave.leave_type, leave.total_days)
            db.commit()
            send_leave_status_email(
                employee.email, employee.full_name,
                leave.leave_type.value, leave.start_date, leave.end_date,
                leave.total_days, "approved", data.comment or "", leave.reason
            )
            # Notify HR about approval
            if employee.hr_id:
                hr = db.query(User).filter(User.id == employee.hr_id).first()
                if hr:
                    send_leave_status_email(
                        hr.email, hr.full_name,
                        leave.leave_type.value, leave.start_date, leave.end_date,
                        leave.total_days, "approved", data.comment or "", leave.reason
                    )
            else:
                hr_users = db.query(User).filter(User.role == UserRole.HR, User.is_active == True).all()
                for hr in hr_users:
                    send_leave_status_email(
                        hr.email, hr.full_name,
                        leave.leave_type.value, leave.start_date, leave.end_date,
                        leave.total_days, "approved", data.comment or "", leave.reason
                    )
            # Notify the assigned manager if admin stepped in on their behalf
            if leave.manager_id and leave.manager_id != current_user.id:
                assigned_mgr = db.query(User).filter(User.id == leave.manager_id).first()
                if assigned_mgr and assigned_mgr.role not in [UserRole.ADMIN, UserRole.MAIN_MANAGER]:
                    send_admin_approved_manager_notification(
                        assigned_mgr.email, assigned_mgr.full_name,
                        employee.full_name, leave.leave_type.value,
                        leave.start_date, leave.end_date, leave.total_days,
                        leave.reason, data.comment or ""
                    )
        else:
            leave.status = LeaveStatus.REJECTED
            send_leave_status_email(
                employee.email, employee.full_name,
                leave.leave_type.value, leave.start_date, leave.end_date,
                leave.total_days, "rejected", data.comment or "", leave.reason
            )
            # Notify HR about rejection
            if employee.hr_id:
                hr = db.query(User).filter(User.id == employee.hr_id).first()
                if hr:
                    send_leave_status_email(
                        hr.email, hr.full_name,
                        leave.leave_type.value, leave.start_date, leave.end_date,
                        leave.total_days, "rejected", data.comment or "", leave.reason
                    )
        leave.main_manager_id = current_user.id
        leave.main_manager_comment = data.comment
        leave.main_manager_action = data.action
        leave.main_manager_action_at = datetime.utcnow()
    else:
        raise HTTPException(403, "Not authorized to action leave")

    db.commit()
    db.refresh(leave)
    return leave


@router.delete("/{leave_id}")
def cancel_leave(leave_id: int, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(404, "Leave not found")
    if leave.user_id != current_user.id:
        raise HTTPException(403, "Not authorized")
    if leave.status not in [LeaveStatus.PENDING, LeaveStatus.APPROVED_BY_MANAGER]:
        raise HTTPException(400, "Cannot cancel this leave")
    leave.status = LeaveStatus.CANCELLED
    db.commit()
    return {"message": "Leave cancelled"}
