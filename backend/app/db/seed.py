import json
import logging
from datetime import date
from pathlib import Path

from app.core.security import get_password_hash
from app.db.database import SessionLocal
from app.models.models import (
    BusinessUnit,
    Department,
    EmploymentType,
    Holiday,
    HolidayType,
    LeaveBalance,
    User,
    UserRole,
)

logger = logging.getLogger(__name__)

_DATA_FILE = Path(__file__).parent / "seed_data.json"

_BUSINESS_UNIT_MAP = {
    "MEPSTRA_POWER_SOLUTIONS": BusinessUnit.MEPSTRA_POWER_SOLUTIONS,
    "MEPSTRA_ENGINEERING_CONSULTANCY": BusinessUnit.MEPSTRA_ENGINEERING_CONSULTANCY,
}

_ROLE_MAP = {
    "ADMIN": UserRole.ADMIN,
    "HR": UserRole.HR,
    "MAIN_MANAGER": UserRole.MAIN_MANAGER,
    "MANAGER": UserRole.MANAGER,
    "TEAM_LEAD": UserRole.TEAM_LEAD,
    "EMPLOYEE": UserRole.EMPLOYEE,
}

_EMPLOYMENT_MAP = {
    "PERMANENT": EmploymentType.PERMANENT,
    "INTERN": EmploymentType.INTERN,
    "CONTRACT": EmploymentType.CONTRACT,
}

_HOLIDAY_TYPE_MAP = {
    "MANDATORY": HolidayType.MANDATORY,
    "OPTIONAL": HolidayType.OPTIONAL,
}


def _get_or_create_department(db, name: str, business_unit: BusinessUnit, description: str) -> Department:
    department = db.query(Department).filter(
        Department.name == name,
        Department.business_unit == business_unit,
    ).first()
    if not department:
        department = Department(name=name, business_unit=business_unit, description=description)
        db.add(department)
    else:
        department.business_unit = business_unit
        department.description = description
    db.commit()
    db.refresh(department)
    return department


def _get_or_create_user(db, email: str, defaults: dict) -> User:
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not user:
        user = User(email=email.lower().strip(), **defaults)
        db.add(user)
    else:
        for field, value in defaults.items():
            setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


def _sync_departments(db, dept_data: list) -> dict[tuple[str, BusinessUnit], Department]:
    departments = {}
    for item in dept_data:
        bu = _BUSINESS_UNIT_MAP[item["business_unit"]]
        dept = _get_or_create_department(db, item["name"], bu, item["description"])
        departments[(item["name"], bu)] = dept

    allowed_ids = {d.id for d in departments.values()}
    for extra in db.query(Department).filter(~Department.id.in_(allowed_ids)).all():
        db.delete(extra)
    db.commit()
    return departments


def _remap_users_to_departments(db, departments: dict[tuple[str, BusinessUnit], Department]) -> None:
    dept_by_id = {d.id: d for d in db.query(Department).all()}
    for user in db.query(User).all():
        current = dept_by_id.get(user.department_id)
        current_name = current.name if current else None
        bu = user.business_unit or BusinessUnit.MEPSTRA_ENGINEERING_CONSULTANCY
        matched = next(
            (dept for (name, unit), dept in departments.items() if unit == bu and name == current_name),
            None,
        )
        if matched:
            user.department_id = matched.id
            user.business_unit = bu
    db.commit()


def _seed_users(db, user_data: list, departments: dict[tuple[str, BusinessUnit], Department]) -> dict[str, User]:
    # First pass: create users without relationships
    user_objects: dict[str, User] = {}
    for item in user_data:
        bu = _BUSINESS_UNIT_MAP[item["business_unit"]]
        dept = departments.get((item["department"], bu))
        defaults = {
            "full_name": item["full_name"],
            "hashed_password": get_password_hash(item["password"]),
            "role": _ROLE_MAP[item["role"]],
            "employment_type": _EMPLOYMENT_MAP[item["employment_type"]],
            "business_unit": bu,
            "department_id": dept.id if dept else None,
            "joining_date": date.fromisoformat(item["joining_date"]),
            "is_active": True,
        }
        user = _get_or_create_user(db, item["email"], defaults)
        user_objects[item["email"]] = user

    # Second pass: wire up manager/hr references
    for item in user_data:
        user = user_objects[item["email"]]
        changed = False
        if item.get("manager") and item["manager"] in user_objects:
            user.manager_id = user_objects[item["manager"]].id
            changed = True
        if item.get("hr") and item["hr"] in user_objects:
            user.hr_id = user_objects[item["hr"]].id
            changed = True
        if changed:
            db.commit()
            db.refresh(user)

    return user_objects


def _seed_holidays(db, holiday_data: list) -> None:
    for item in holiday_data:
        hdate = date.fromisoformat(item["date"])
        exists = db.query(Holiday).filter(Holiday.date == hdate).first()
        if not exists:
            db.add(Holiday(
                name=item["name"],
                date=hdate,
                holiday_type=_HOLIDAY_TYPE_MAP[item["type"]],
                year=item["year"],
            ))
    db.commit()


def seed_data():
    data = json.loads(_DATA_FILE.read_text(encoding="utf-8"))
    db = SessionLocal()
    try:
        departments = _sync_departments(db, data["departments"])
        _remap_users_to_departments(db, departments)
        users = _seed_users(db, data["users"], departments)

        for user in users.values():
            balance = db.query(LeaveBalance).filter(
                LeaveBalance.user_id == user.id,
                LeaveBalance.year == date.today().year,
            ).first()
            if not balance:
                db.add(LeaveBalance(user_id=user.id, year=date.today().year))
        db.commit()

        _seed_holidays(db, data["holidays"])

        logger.info("Seed data loaded from seed_data.json successfully")
    except Exception as e:
        db.rollback()
        logger.error("Seed failed: %s", e)
        raise
    finally:
        db.close()
