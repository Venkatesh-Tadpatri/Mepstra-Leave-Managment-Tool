"""
Run this script once to fix total_days for all existing WFH records
that were saved with the old Mon-Fri only calculation.

Usage (from the backend folder):
    python fix_wfh_days.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.db.database import SessionLocal
from app.models.models import WorkFromHomeRequest, Holiday, HolidayType
from datetime import timedelta


def is_working_saturday(d) -> bool:
    """2nd and 4th Saturdays are working days."""
    return ((d.day - 1) // 7 + 1) % 2 == 0


def recalc_working_days(start, end, db) -> float:
    from sqlalchemy import and_
    holidays = db.query(Holiday).filter(
        Holiday.date >= start,
        Holiday.date <= end,
        Holiday.holiday_type == HolidayType.MANDATORY,
    ).all()
    holiday_dates = {h.date for h in holidays}

    count = 0.0
    cur = start
    while cur <= end:
        is_sunday   = cur.weekday() == 6
        is_saturday = cur.weekday() == 5
        working_sat = is_saturday and is_working_saturday(cur)
        if not is_sunday and (not is_saturday or working_sat) and cur not in holiday_dates:
            count += 1
        cur += timedelta(days=1)
    return max(count, 1.0)


def main():
    db = SessionLocal()
    try:
        records = db.query(WorkFromHomeRequest).all()
        updated = 0
        for rec in records:
            correct = recalc_working_days(rec.start_date, rec.end_date, db)
            if rec.total_days != correct:
                print(f"  WFH #{rec.id} ({rec.start_date} to {rec.end_date}): "
                      f"{rec.total_days} -> {correct}")
                rec.total_days = correct
                updated += 1
        db.commit()
        print(f"\nDone. Updated {updated} record(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
