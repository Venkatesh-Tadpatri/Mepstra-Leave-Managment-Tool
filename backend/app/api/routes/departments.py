from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.api.deps import get_current_user, require_admin
from app.schemas.schemas import DepartmentCreate, DepartmentResponse
from app.models.models import Department

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("", response_model=List[DepartmentResponse])
def list_departments(db: Session = Depends(get_db)):
    return db.query(Department).order_by(Department.business_unit, Department.name).all()


@router.post("", response_model=DepartmentResponse, status_code=201)
def create_department(data: DepartmentCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(Department).filter(
        Department.name == data.name,
        Department.business_unit == data.business_unit,
    ).first():
        raise HTTPException(400, "Department already exists")
    dept = Department(**data.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.put("/{dept_id}", response_model=DepartmentResponse)
def update_department(dept_id: int, data: DepartmentCreate, db: Session = Depends(get_db),
                      _=Depends(require_admin)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")
    duplicate = db.query(Department).filter(
        Department.id != dept_id,
        Department.name == data.name,
        Department.business_unit == data.business_unit,
    ).first()
    if duplicate:
        raise HTTPException(400, "Department already exists")
    dept.name = data.name
    dept.business_unit = data.business_unit
    dept.description = data.description
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")
    db.delete(dept)
    db.commit()
    return {"message": "Department deleted"}
