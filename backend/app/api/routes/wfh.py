from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from datetime import date, datetime
from app.db.database import get_db
from app.api.deps import get_current_user
from app.schemas.schemas import WFHCreate, WFHUpdate, WFHResponse
from app.models.models import WorkFromHomeRequest, WFHStatus, User, UserRole, Department

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

    req.manager_comment = data.comment
    req.manager_action_at = datetime.utcnow()
    db.commit()
    db.refresh(req)
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
