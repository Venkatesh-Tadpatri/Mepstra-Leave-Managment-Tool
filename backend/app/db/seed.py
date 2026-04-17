from datetime import date
import logging

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

ALLOWED_DEPARTMENTS = {
    BusinessUnit.MEPSTRA_POWER_SOLUTIONS: [
        ("Sales Team", "Sales department"),
        ("Service Team", "Service department"),
        ("Plant Team", "Factory department"),
        ("HR/Admin", "HR and Administration team"),
    ],
    BusinessUnit.MEPSTRA_ENGINEERING_CONSULTANCY: [
        ("Mechanical Engineering", "Mechanical engineering department"),
        ("Electrical Engineering", "Electrical engineering department"),
        ("Software", "Software department"),
        ("HR/Admin", "HR and Administration team"),
    ],
}


def _email_variants(email: str) -> list[str]:
    normalized = email.lower().strip()
    variants = [normalized]

    if normalized.endswith("@mepstra.com"):
        variants.append(normalized.replace("@mepstra.com", "@mepstra.com"))
    elif normalized.endswith("@mepstra.com"):
        variants.append(normalized.replace("@mepstra.com", "@mepstra.com"))

    return list(dict.fromkeys(variants))


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


def _get_or_create_demo_user(db, email: str, defaults: dict) -> User:
    user = None
    for variant in _email_variants(email):
        user = db.query(User).filter(User.email == variant).first()
        if user:
            break

    if not user:
        user = User(email=email.lower().strip(), **defaults)
        db.add(user)
    else:
        user.email = email.lower().strip()
        for field, value in defaults.items():
            setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


def _sync_allowed_departments(db) -> dict[tuple[str, BusinessUnit], Department]:
    departments = {}
    for business_unit, items in ALLOWED_DEPARTMENTS.items():
        for name, description in items:
            department = _get_or_create_department(db, name, business_unit, description)
            departments[(name, business_unit)] = department
    return departments


def _guess_business_unit(user: User, current_department_name: str | None) -> BusinessUnit:
    if user.business_unit:
        return user.business_unit
    if current_department_name in {"Sales Team", "Service Team", "Plant Team"}:
        return BusinessUnit.MEPSTRA_POWER_SOLUTIONS
    return BusinessUnit.MEPSTRA_ENGINEERING_CONSULTANCY


def _target_department_name(user: User, current_department_name: str | None, business_unit: BusinessUnit) -> str:
    current = (current_department_name or "").lower()

    if business_unit == BusinessUnit.MEPSTRA_POWER_SOLUTIONS:
        if "sales" in current:
            return "Sales Team"
        if "service" in current:
            return "Service Team"
        if "plant" in current or "factory" in current:
            return "Plant Team"
        if "hr" in current:
            return "HR/Admin"
        if user.role == UserRole.HR:
            return "HR/Admin"
        if user.role == UserRole.MANAGER:
            return "Sales Team"
        return "Plant Team"

    if "mechanical" in current:
        return "Mechanical Engineering"
    if "electrical" in current:
        return "Electrical Engineering"
    if "software" in current:
        return "Software"
    if "hr" in current:
        return "HR/Admin"
    if user.role == UserRole.HR:
        return "HR/Admin"
    if user.role in (UserRole.ADMIN, UserRole.MAIN_MANAGER):
        return "Mechanical Engineering"
    return "Software"


def _remap_users_to_allowed_departments(db, departments: dict[tuple[str, BusinessUnit], Department]) -> None:
    all_departments = {department.id: department for department in db.query(Department).all()}
    for user in db.query(User).all():
        current_department = all_departments.get(user.department_id)
        current_department_name = current_department.name if current_department else None
        business_unit = _guess_business_unit(user, current_department_name)
        user.business_unit = business_unit
        target_department_name = _target_department_name(user, current_department_name, business_unit)
        user.department_id = departments[(target_department_name, business_unit)].id
    db.commit()


def _delete_extra_departments(db, departments: dict[tuple[str, BusinessUnit], Department]) -> None:
    allowed_ids = {department.id for department in departments.values()}
    extras = db.query(Department).filter(~Department.id.in_(allowed_ids)).all()
    for department in extras:
        db.delete(department)
    db.commit()


def seed_data():
    db = SessionLocal()
    try:
        departments = _sync_allowed_departments(db)
        _remap_users_to_allowed_departments(db, departments)
        _delete_extra_departments(db, departments)

        mechanical_dept = departments[("Mechanical Engineering", BusinessUnit.MEPSTRA_ENGINEERING_CONSULTANCY)]
        software_dept = departments[("Software", BusinessUnit.MEPSTRA_ENGINEERING_CONSULTANCY)]
        hradmin_consultancy = departments[("HR/Admin", BusinessUnit.MEPSTRA_ENGINEERING_CONSULTANCY)]
        sales_dept = departments[("Sales Team", BusinessUnit.MEPSTRA_POWER_SOLUTIONS)]
        plant_dept = departments[("Plant Team", BusinessUnit.MEPSTRA_POWER_SOLUTIONS)]

        admin = _get_or_create_demo_user(db, "admin@mepstra.com", {
            "full_name": "Deepak Dixith",
            "hashed_password": get_password_hash("1234"),
            "role": UserRole.ADMIN,
            "employment_type": EmploymentType.PERMANENT,
            "business_unit": BusinessUnit.MEPSTRA_ENGINEERING_CONSULTANCY,
            "department_id": mechanical_dept.id,
            "joining_date": date(2020, 1, 1),
            "is_active": True,
        })


        hr_user = _get_or_create_demo_user(db, "hr@mepstra.com", {
            "full_name": "Kavya Reddy",
            "hashed_password": get_password_hash("1234"),
            "role": UserRole.HR,
            "employment_type": EmploymentType.PERMANENT,
            "business_unit": BusinessUnit.MEPSTRA_ENGINEERING_CONSULTANCY,
            "department_id": hradmin_consultancy.id,
            "joining_date": date(2020, 3, 1),
            "is_active": True,
        })

        main_mgr = _get_or_create_demo_user(db, "mainmanager@mepstra.com", {
            "full_name": "Srinivas Rao",
            "hashed_password": get_password_hash("1234"),
            "role": UserRole.MAIN_MANAGER,
            "employment_type": EmploymentType.PERMANENT,
            "business_unit": BusinessUnit.MEPSTRA_ENGINEERING_CONSULTANCY,
            "department_id": mechanical_dept.id,
            "joining_date": date(2020, 2, 1),
            "hr_id": hr_user.id,
            "is_active": True,
        })

        manager = _get_or_create_demo_user(db, "manager@mepstra.com", {
            "full_name": "Rahul Varma",
            "hashed_password": get_password_hash("1234"),
            "role": UserRole.MANAGER,
            "employment_type": EmploymentType.PERMANENT,
            "business_unit": BusinessUnit.MEPSTRA_POWER_SOLUTIONS,
            "department_id": sales_dept.id,
            "joining_date": date(2021, 6, 15),
            "manager_id": admin.id,
            "hr_id": hr_user.id,
            "is_active": True,
        })

        employee = _get_or_create_demo_user(db, "employee@mepstra.com", {
            "full_name": "Ananya Sharma",
            "hashed_password": get_password_hash("1234"),
            "role": UserRole.EMPLOYEE,
            "employment_type": EmploymentType.PERMANENT,
            "business_unit": BusinessUnit.MEPSTRA_POWER_SOLUTIONS,
            "department_id": plant_dept.id,
            "joining_date": date(2023, 1, 10),
            "manager_id": manager.id,
            "hr_id": hr_user.id,
            "is_active": True,
        })

        for user in [admin, main_mgr, hr_user, manager, employee]:
            balance = db.query(LeaveBalance).filter(
                LeaveBalance.user_id == user.id,
                LeaveBalance.year == date.today().year,
            ).first()
            if not balance:
                db.add(LeaveBalance(user_id=user.id, year=date.today().year))

        holidays_2026 = [
            ("New Year's Day", date(2026, 1, 1)),
            ("Republic Day", date(2026, 1, 26)),
            ("Holi", date(2026, 3, 3)),
            ("Gandhi Jayanti", date(2026, 10, 2)),
            ("Christmas", date(2026, 12, 25)),
        ]
        for name, hdate in holidays_2026:
            exists = db.query(Holiday).filter(Holiday.date == hdate).first()
            if not exists:
                db.add(Holiday(name=name, date=hdate, holiday_type=HolidayType.MANDATORY, year=2026))

        optional_holidays = [
            ("Ugadi", date(2026, 3, 19)),
            ("Pongal", date(2026, 1, 14)),
        ]
        for name, hdate in optional_holidays:
            exists = db.query(Holiday).filter(Holiday.date == hdate).first()
            if not exists:
                db.add(Holiday(name=name, date=hdate, holiday_type=HolidayType.OPTIONAL, year=2026))

        db.commit()
        logger.info("Seed data ensured successfully")
        print("\n=== DEPARTMENTS SYNCED ===")
        print("Mepstra Power Solutions: Sales Team, Service Team, Plant Team, HR/Admin")
        print("Mepstra Engineering Consultancy: Mechanical Engineering, Electrical Engineering, Software, HR/Admin")
        print("================================\n")
    except Exception as e:
        db.rollback()
        logger.error("Seed failed: %s", e)
    finally:
        db.close()
