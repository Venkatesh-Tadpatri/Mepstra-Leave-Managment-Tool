from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.api.deps import get_current_user, require_admin, require_admin_or_hr
from app.schemas.schemas import HolidayCreate, HolidayResponse
from app.models.models import Holiday
from datetime import date



router = APIRouter(prefix="/holidays", tags=["Holidays"])


@router.get("", response_model=List[HolidayResponse])
def list_holidays(year: Optional[int] = None, db: Session = Depends(get_db),
                  _=Depends(get_current_user)):
    q = db.query(Holiday)
    if year:
        q = q.filter(Holiday.year == year)
    return q.order_by(Holiday.date).all()


@router.post("", response_model=HolidayResponse, status_code=201)
def create_holiday(data: HolidayCreate, db: Session = Depends(get_db), _=Depends(require_admin_or_hr)):
    existing = db.query(Holiday).filter(Holiday.date == data.date).first()
    if existing:
        raise HTTPException(400, "Holiday already exists for this date")
    holiday = Holiday(**data.model_dump())
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return holiday


@router.put("/{holiday_id}", response_model=HolidayResponse)
def update_holiday(holiday_id: int, data: HolidayCreate, db: Session = Depends(get_db),
                   _=Depends(require_admin_or_hr)):
    holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(404, "Holiday not found")
    for k, v in data.model_dump().items():
        setattr(holiday, k, v)
    db.commit()
    db.refresh(holiday)
    return holiday


@router.delete("/{holiday_id}")
def delete_holiday(holiday_id: int, db: Session = Depends(get_db), _=Depends(require_admin_or_hr)):
    holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(404, "Holiday not found")
    db.delete(holiday)
    db.commit()
    return {"message": "Holiday deleted"}


@router.post("/bulk", status_code=201)
def bulk_create_holidays(data: List[HolidayCreate], db: Session = Depends(get_db), _=Depends(require_admin_or_hr)):
    created = []
    skipped = []
    for item in data:
        existing = db.query(Holiday).filter(Holiday.date == item.date).first()
        if existing:
            skipped.append(str(item.date))
            continue
        holiday = Holiday(**item.model_dump())
        db.add(holiday)
        created.append(str(item.date))
    db.commit()
    return {"created": len(created), "skipped": len(skipped), "skipped_dates": skipped}
