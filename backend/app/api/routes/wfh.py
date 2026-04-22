from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_, extract, func
from typing import List, Optional
from datetime import date, datetime
from app.db.database import get_db
from app.api.deps import get_current_user
from app.schemas.schemas import WFHCreate, WFHUpdate, WFHResponse
from app.models.models import WorkFromHomeRequest, WFHStatus, User, UserRole, Department
from app.services.email_service import send_wfh_request_email, send_wfh_status_email
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wfh", tags=["Work From Home"])


def _working_days(start: date, end: date) -> float:
    from datetime import timedelta
    count = 0.0
    cur = start
    while cur <= end:
        if cur.weekday() < 5:
            count += 1
        cur += timedelta(days=1)
    return max(count, 1.0)


def _serialize(req: WorkFromHomeRequest) -> dict:
    return {
        "id": req.id,
        "user_id": req.user_id,
        "start_date": str(req.start_date),
        "end_date": str(req.end_date),
        "total_days": req.total_days,
        "reason": req.reason,
        "status": req.status.value if hasattr(req.status, "value") else req.status,
        "manager_comment": req.manager_comment,
        "manager_action_at": req.manager_action_at.isoformat() if req.manager_action_at else None,
        "created_at": req.created_at.isoformat() if req.created_at else None,
        "user": {
            "id": req.user.id,
            "full_name": req.user.full_name,
            "email": req.user.email,
            "role": req.user.role.value if hasattr(req.user.role, "value") else req.user.role,
            "department": {
                "id": req.user.department.id,
                "name": req.user.department.name,
                "business_unit": req.user.department.business_unit.value
                    if hasattr(req.user.department.business_unit, "value")
                    else req.user.department.business_unit,
            } if req.user.department else None,
        } if req.user else None,
        "manager": {
            "id": req.manager.id,
            "full_name": req.manager.full_name,
            "email": req.manager.email,
            "role": req.manager.role.value if hasattr(req.manager.role, "value") else req.manager.role,
            "department": None,
        } if req.manager else None,
    }


@router.post("", status_code=201)
def submit_wfh(
    data: WFHCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Employee submits a WFH request."""
    days = _working_days(data.start_date, data.end_date)
    req = WorkFromHomeRequest(
        user_id=current_user.id,
        start_date=data.start_date,
        end_date=data.end_date,
        total_days=days,
        reason=data.reason,
        status=WFHStatus.PENDING,
        manager_id=current_user.manager_id,
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Notify manager in background (non-blocking)
    manager = db.query(User).filter(User.id == current_user.manager_id).first()
    if manager:
        background_tasks.add_task(
            send_wfh_request_email,
            employee_name=current_user.full_name,
            start_date=data.start_date,
            end_date=data.end_date,
            total_days=days,
            reason=data.reason or "",
            approver_email=manager.email,
            approver_name=manager.full_name,
        )

    return _serialize(req)


@router.get("/mine")
def my_wfh_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Employee's own WFH requests."""
    reqs = (
        db.query(WorkFromHomeRequest)
        .filter(WorkFromHomeRequest.user_id == current_user.id)
        .order_by(WorkFromHomeRequest.created_at.desc())
        .all()
    )
    return [_serialize(r) for r in reqs]


@router.get("/pending")
def pending_wfh(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pending WFH requests for manager/admin/hr to review."""
    allowed = [UserRole.ADMIN, UserRole.MAIN_MANAGER, UserRole.HR, UserRole.MANAGER, UserRole.TEAM_LEAD]
    if current_user.role not in allowed:
        raise HTTPException(403, "Not authorized")

    q = db.query(WorkFromHomeRequest).filter(WorkFromHomeRequest.status == WFHStatus.PENDING)
    if current_user.role in [UserRole.MANAGER, UserRole.TEAM_LEAD]:
        q = q.filter(WorkFromHomeRequest.manager_id == current_user.id)

    reqs = q.order_by(WorkFromHomeRequest.created_at.desc()).all()
    return [_serialize(r) for r in reqs]


@router.get("/all")
def all_wfh(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All WFH requests (any status) for manager/admin/hr."""
    allowed = [UserRole.ADMIN, UserRole.MAIN_MANAGER, UserRole.HR, UserRole.MANAGER, UserRole.TEAM_LEAD]
    if current_user.role not in allowed:
        raise HTTPException(403, "Not authorized")

    q = db.query(WorkFromHomeRequest)
    if current_user.role in [UserRole.MANAGER, UserRole.TEAM_LEAD]:
        q = q.filter(WorkFromHomeRequest.manager_id == current_user.id)

    reqs = q.order_by(WorkFromHomeRequest.created_at.desc()).all()
    return [_serialize(r) for r in reqs]


@router.get("/today")
def wfh_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List of employees working from home today (approved WFH)."""
    allowed = [UserRole.ADMIN, UserRole.MAIN_MANAGER, UserRole.HR, UserRole.MANAGER, UserRole.TEAM_LEAD]
    if current_user.role not in allowed:
        raise HTTPException(403, "Not authorized")

    today = date.today()
    q = (
        db.query(WorkFromHomeRequest)
        .filter(
            WorkFromHomeRequest.start_date <= today,
            WorkFromHomeRequest.end_date >= today,
            WorkFromHomeRequest.status == WFHStatus.APPROVED,
        )
    )
    if current_user.role in [UserRole.MANAGER, UserRole.TEAM_LEAD]:
        q = q.filter(WorkFromHomeRequest.manager_id == current_user.id)

    reqs = q.all()
    return [
        {
            "id": r.id,
            "employee_name": r.user.full_name if r.user else "—",
            "department": r.user.department.name if r.user and r.user.department else None,
            "start_date": str(r.start_date),
            "end_date": str(r.end_date),
            "total_days": r.total_days,
        }
        for r in reqs
    ]


@router.patch("/{req_id}")
def action_wfh(
    req_id: int,
    data: WFHUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manager/admin/hr approves or rejects a WFH request."""
    allowed = [UserRole.ADMIN, UserRole.MAIN_MANAGER, UserRole.HR, UserRole.MANAGER, UserRole.TEAM_LEAD]
    if current_user.role not in allowed:
        raise HTTPException(403, "Not authorized")

    req = db.query(WorkFromHomeRequest).filter(WorkFromHomeRequest.id == req_id).first()
    if not req:
        raise HTTPException(404, "WFH request not found")
    if req.status != WFHStatus.PENDING:
        raise HTTPException(400, "Request has already been actioned")

    if data.action == "approve":
        req.status = WFHStatus.APPROVED
    elif data.action == "reject":
        req.status = WFHStatus.REJECTED
    else:
        raise HTTPException(400, "action must be 'approve' or 'reject'")

    req.manager_id = current_user.id
    req.manager_comment = data.comment
    req.manager_action_at = datetime.utcnow()
    db.commit()
    db.refresh(req)

    # Notify employee in background (non-blocking)
    employee = db.query(User).filter(User.id == req.user_id).first()
    if employee:
        background_tasks.add_task(
            send_wfh_status_email,
            employee_email=employee.email,
            employee_name=employee.full_name,
            start_date=req.start_date,
            end_date=req.end_date,
            total_days=req.total_days,
            status=data.action + "d",
            comment=data.comment or "",
        )

    return _serialize(req)


@router.delete("/{req_id}", status_code=200)
def cancel_wfh(
    req_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Employee cancels their own pending WFH request."""
    req = db.query(WorkFromHomeRequest).filter(
        WorkFromHomeRequest.id == req_id,
        WorkFromHomeRequest.user_id == current_user.id,
    ).first()
    if not req:
        raise HTTPException(404, "WFH request not found")
    if req.status != WFHStatus.PENDING:
        raise HTTPException(400, "Only pending requests can be cancelled")
    req.status = WFHStatus.CANCELLED
    db.commit()
    return {"message": "WFH request cancelled"}


@router.get("/report")
def wfh_report(
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin/HR/Manager: full WFH report with monthly breakdown and per-employee records."""
    allowed = [UserRole.ADMIN, UserRole.MAIN_MANAGER, UserRole.HR, UserRole.MANAGER, UserRole.TEAM_LEAD]
    if current_user.role not in allowed:
        raise HTTPException(403, "Not authorized")

    y = year or date.today().year

    # All approved WFH for the year
    q = db.query(WorkFromHomeRequest).filter(
        WorkFromHomeRequest.status == WFHStatus.APPROVED,
        extract("year", WorkFromHomeRequest.start_date) == y,
    )
    # Managers/team leads only see their own assigned employees
    if current_user.role in [UserRole.MANAGER, UserRole.TEAM_LEAD]:
        assigned_ids = [
            u.id for u in db.query(User).filter(
                User.manager_id == current_user.id if current_user.role == UserRole.MANAGER
                else User.team_lead_id == current_user.id,
                User.is_active == True,
            ).all()
        ]
        q = q.filter(WorkFromHomeRequest.user_id.in_(assigned_ids))

    reqs = q.order_by(WorkFromHomeRequest.start_date.asc()).all()

    # Monthly breakdown
    monthly = {}
    for m in range(1, 13):
        monthly[m] = 0
    for r in reqs:
        monthly[r.start_date.month] += 1

    # Per-employee summary
    emp_map: dict[int, dict] = {}
    for r in reqs:
        uid = r.user_id
        if uid not in emp_map:
            emp_map[uid] = {
                "employee_name": r.user.full_name if r.user else "—",
                "department": r.user.department.name if r.user and r.user.department else "—",
                "count": 0,
                "dates": [],
            }
        emp_map[uid]["count"] += 1
        approved_by = r.manager.full_name if r.manager else "—"
        emp_map[uid]["dates"].append({
            "date": str(r.start_date),
            "approved_by": approved_by,
        })

    return {
        "year": y,
        "total": len(reqs),
        "monthly": [{"month": m, "count": monthly[m]} for m in range(1, 13)],
        "employees": list(emp_map.values()),
        "records": [_serialize(r) for r in reqs],
    }
