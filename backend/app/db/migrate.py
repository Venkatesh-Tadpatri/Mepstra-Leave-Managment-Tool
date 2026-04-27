"""
Lightweight schema migration for MySQL.
Runs on every startup — each step is idempotent.

IMPORTANT: SQLAlchemy stores enum *names* (uppercase) in MySQL by default,
e.g. EmploymentType.PERMANENT is stored as 'PERMANENT', not 'permanent'.
All ENUM definitions here must match that convention.
"""
from sqlalchemy import text
from app.db.database import engine
import logging

logger = logging.getLogger(__name__)


def _column_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(text(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() "
        "AND TABLE_NAME = :table AND COLUMN_NAME = :col"
    ), {"table": table, "col": column})
    return result.scalar() > 0


def _table_exists(conn, table: str) -> bool:
    result = conn.execute(text(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES "
        "WHERE TABLE_SCHEMA = DATABASE() "
        "AND TABLE_NAME = :table"
    ), {"table": table})
    return result.scalar() > 0


def _get_column_type(conn, table: str, column: str) -> str:
    result = conn.execute(text(
        "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() "
        "AND TABLE_NAME = :table AND COLUMN_NAME = :col"
    ), {"table": table, "col": column})
    row = result.fetchone()
    return row[0] if row else ""


def _is_column_nullable(conn, table: str, column: str) -> bool:
    result = conn.execute(text(
        "SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS "
        "WHERE TABLE_SCHEMA = DATABASE() "
        "AND TABLE_NAME = :table AND COLUMN_NAME = :col"
    ), {"table": table, "col": column})
    row = result.fetchone()
    return row[0] == "YES" if row else True


def _index_exists(conn, table: str, index_name: str) -> bool:
    result = conn.execute(text(
        "SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS "
        "WHERE TABLE_SCHEMA = DATABASE() "
        "AND TABLE_NAME = :table AND INDEX_NAME = :index_name"
    ), {"table": table, "index_name": index_name})
    return result.scalar() > 0


def run_migrations():
    """Apply all pending schema changes to the MySQL database."""
    with engine.connect() as conn:

        # ── users.employment_type ─────────────────────────────────────────
        if not _column_exists(conn, "users", "employment_type"):
            logger.info("Adding users.employment_type")
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN employment_type "
                "ENUM('INTERN','PERMANENT','CONTRACT') NULL"
            ))
            conn.commit()
        else:
            # Fix if previously created with lowercase values
            col_type = _get_column_type(conn, "users", "employment_type")
            if "'intern'" in col_type or "'INTERN'" not in col_type:
                logger.info("Fixing users.employment_type ENUM to uppercase")
                conn.execute(text(
                    "ALTER TABLE users MODIFY COLUMN employment_type "
                    "ENUM('INTERN','PERMANENT','CONTRACT') NULL"
                ))
                conn.commit()

        # ── users.business_unit ───────────────────────────────────────────
        if not _column_exists(conn, "users", "business_unit"):
            logger.info("Adding users.business_unit")
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN business_unit "
                "ENUM('MEPSTRA_POWER_SOLUTIONS','MEPSTRA_ENGINEERING_CONSULTANCY') NULL"
            ))
            conn.commit()
        else:
            col_type = _get_column_type(conn, "users", "business_unit")
            if "'mepstra_power_solutions'" in col_type or "'MEPSTRA_POWER_SOLUTIONS'" not in col_type:
                logger.info("Fixing users.business_unit ENUM to uppercase")
                conn.execute(text(
                    "ALTER TABLE users MODIFY COLUMN business_unit "
                    "ENUM('MEPSTRA_POWER_SOLUTIONS','MEPSTRA_ENGINEERING_CONSULTANCY') NULL"
                ))
                conn.commit()

        # departments.business_unit
        if not _column_exists(conn, "departments", "business_unit"):
            logger.info("Adding departments.business_unit")
            conn.execute(text(
                "ALTER TABLE departments ADD COLUMN business_unit "
                "ENUM('MEPSTRA_POWER_SOLUTIONS','MEPSTRA_ENGINEERING_CONSULTANCY') NULL"
            ))
            conn.commit()
        else:
            col_type = _get_column_type(conn, "departments", "business_unit")
            if col_type and ("'mepstra_power_solutions'" in col_type or "'MEPSTRA_POWER_SOLUTIONS'" not in col_type):
                logger.info("Fixing departments.business_unit ENUM to uppercase")
                conn.execute(text(
                    "ALTER TABLE departments MODIFY COLUMN business_unit "
                    "ENUM('MEPSTRA_POWER_SOLUTIONS','MEPSTRA_ENGINEERING_CONSULTANCY') NULL"
                ))
                conn.commit()

        if _index_exists(conn, "departments", "name"):
            logger.info("Dropping unique index departments.name")
            conn.execute(text("ALTER TABLE departments DROP INDEX name"))
            conn.commit()

        if not _index_exists(conn, "departments", "uq_departments_name_business_unit"):
            logger.info("Adding composite unique index for departments")
            conn.execute(text(
                "ALTER TABLE departments ADD UNIQUE INDEX uq_departments_name_business_unit (name, business_unit)"
            ))
            conn.commit()

        # Remove legacy users.employee_id column if present.
        if _column_exists(conn, "users", "employee_id"):
            logger.info("Dropping users.employee_id column")
            conn.execute(text("ALTER TABLE users DROP COLUMN employee_id"))
            conn.commit()


        # ── leave_balances new columns ────────────────────────────────────
        for col, default in [
            ("special_total", "0.0"),
            ("special_used",  "0.0"),
            ("lop_total",     "365.0"),
            ("lop_used",      "0.0"),
        ]:
            if not _column_exists(conn, "leave_balances", col):
                logger.info("Adding leave_balances.%s", col)
                conn.execute(text(
                    f"ALTER TABLE leave_balances "
                    f"ADD COLUMN {col} FLOAT NOT NULL DEFAULT {default}"
                ))
                conn.commit()

        # ── leave_requests.is_retroactive ────────────────────────────────
        if not _column_exists(conn, "leave_requests", "is_retroactive"):
            logger.info("Adding leave_requests.is_retroactive")
            conn.execute(text(
                "ALTER TABLE leave_requests "
                "ADD COLUMN is_retroactive TINYINT(1) NOT NULL DEFAULT 0"
            ))
            conn.commit()

        # ── leave_requests.urgent ─────────────────────────────────────────
        if not _column_exists(conn, "leave_requests", "urgent"):
            logger.info("Adding leave_requests.urgent")
            conn.execute(text(
                "ALTER TABLE leave_requests "
                "ADD COLUMN urgent TINYINT(1) NOT NULL DEFAULT 0"
            ))
            conn.commit()

        # ── leave_requests.leave_type → extend ENUM with SPECIAL, LOP ────
        col_type = _get_column_type(conn, "leave_requests", "leave_type")
        if "'SPECIAL'" not in col_type:
            logger.info("Extending leave_requests.leave_type ENUM with SPECIAL, LOP")
            conn.execute(text(
                "ALTER TABLE leave_requests MODIFY COLUMN leave_type "
                "ENUM('CASUAL','SICK','OPTIONAL','MATERNITY','PATERNITY','SPECIAL','LOP') NOT NULL"
            ))
            conn.commit()

        # ── leave_requests.status → extend ENUM with REVOKED ─────────────
        col_type = _get_column_type(conn, "leave_requests", "status")
        if "'REVOKED'" not in col_type:
            logger.info("Extending leave_requests.status ENUM with REVOKED")
            conn.execute(text(
                "ALTER TABLE leave_requests MODIFY COLUMN status "
                "ENUM('PENDING','APPROVED_BY_MANAGER','APPROVED','REJECTED','CANCELLED','REVOKED') NOT NULL"
            ))
            conn.commit()

        # ── users: new personal detail columns ───────────────────────────
        if not _column_exists(conn, "users", "date_of_birth"):
            logger.info("Adding users.date_of_birth")
            conn.execute(text("ALTER TABLE users ADD COLUMN date_of_birth DATE NULL"))
            conn.commit()

        if not _column_exists(conn, "users", "gender"):
            logger.info("Adding users.gender")
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN gender ENUM('MALE','FEMALE','OTHER') NULL"
            ))
            conn.commit()

        if not _column_exists(conn, "users", "marital_status"):
            logger.info("Adding users.marital_status")
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN marital_status ENUM('SINGLE','MARRIED') NULL"
            ))
            conn.commit()

        if not _column_exists(conn, "users", "marriage_date"):
            logger.info("Adding users.marriage_date")
            conn.execute(text("ALTER TABLE users ADD COLUMN marriage_date DATE NULL"))
            conn.commit()

        # ── allowed_emails: new 2-column structure ────────────────────────
        # Step 1 — make legacy email column nullable so new rows (no email) can insert
        if _column_exists(conn, "allowed_emails", "email") and \
                not _is_column_nullable(conn, "allowed_emails", "email"):
            logger.info("Making allowed_emails.email nullable (legacy)")
            conn.execute(text(
                "ALTER TABLE allowed_emails MODIFY COLUMN email VARCHAR(255) NULL"
            ))
            conn.commit()

        # Step 2 — employee_name
        if not _column_exists(conn, "allowed_emails", "employee_name"):
            logger.info("Adding allowed_emails.employee_name")
            conn.execute(text(
                "ALTER TABLE allowed_emails ADD COLUMN employee_name VARCHAR(255) NULL"
            ))
            conn.commit()

        # Step 3 — outlook_email
        if not _column_exists(conn, "allowed_emails", "outlook_email"):
            logger.info("Adding allowed_emails.outlook_email")
            conn.execute(text(
                "ALTER TABLE allowed_emails ADD COLUMN outlook_email VARCHAR(255) NULL"
            ))
            conn.commit()

        # Step 4 — gmail
        if not _column_exists(conn, "allowed_emails", "gmail"):
            logger.info("Adding allowed_emails.gmail")
            conn.execute(text(
                "ALTER TABLE allowed_emails ADD COLUMN gmail VARCHAR(255) NULL"
            ))
            conn.commit()

        # Step 5 — migrate existing legacy email values into the right column
        conn.execute(text(
            "UPDATE allowed_emails "
            "SET gmail = email "
            "WHERE email LIKE '%@gmail.com' AND gmail IS NULL AND email IS NOT NULL"
        ))
        conn.execute(text(
            "UPDATE allowed_emails "
            "SET outlook_email = email "
            "WHERE email NOT LIKE '%@gmail.com' AND outlook_email IS NULL AND email IS NOT NULL"
        ))
        # Fill employee_name from notes or a placeholder for rows that have none
        conn.execute(text(
            "UPDATE allowed_emails "
            "SET employee_name = COALESCE(notes, email) "
            "WHERE employee_name IS NULL"
        ))
        conn.commit()

        # ── special_leave_credits.work_date ──────────────────────────────
        if not _column_exists(conn, "special_leave_credits", "work_date"):
            logger.info("Adding special_leave_credits.work_date")
            conn.execute(text(
                "ALTER TABLE special_leave_credits "
                "ADD COLUMN work_date DATE NULL AFTER days"
            ))
            # Backfill existing rows: set work_date = earned_date as best approximation
            conn.execute(text(
                "UPDATE special_leave_credits SET work_date = earned_date WHERE work_date IS NULL"
            ))
            conn.commit()

        # ── allowed_emails: registered_user_id ───────────────────────────
        if not _column_exists(conn, "allowed_emails", "registered_user_id"):
            logger.info("Adding allowed_emails.registered_user_id")
            conn.execute(text(
                "ALTER TABLE allowed_emails ADD COLUMN registered_user_id INT NULL, "
                "ADD INDEX ix_allowed_emails_registered_user_id (registered_user_id)"
            ))
            # Backfill: link existing whitelist entries to registered users by email
            conn.execute(text(
                "UPDATE allowed_emails ae "
                "JOIN users u ON u.email IN (ae.outlook_email, ae.gmail) "
                "SET ae.registered_user_id = u.id "
                "WHERE ae.registered_user_id IS NULL"
            ))
            conn.commit()

        # ── allowed_emails: leave quota columns ──────────────────────────
        for col, default in [
            ("casual_leaves",   "12.0"),
            ("sick_leaves",     "6.0"),
            ("optional_leaves", "2.0"),
        ]:
            if not _column_exists(conn, "allowed_emails", col):
                logger.info("Adding allowed_emails.%s", col)
                conn.execute(text(
                    f"ALTER TABLE allowed_emails ADD COLUMN {col} FLOAT NOT NULL DEFAULT {default}"
                ))
                conn.commit()

        # registration_otps: move from older hashed OTP column to plain OTP column.
        # Existing OTP rows are temporary, so it is safe to clear them during shape changes.
        if _table_exists(conn, "registration_otps") and not _column_exists(conn, "registration_otps", "otp"):
            logger.info("Adding registration_otps.otp")
            conn.execute(text("DELETE FROM registration_otps"))
            conn.execute(text(
                "ALTER TABLE registration_otps ADD COLUMN otp VARCHAR(6) NOT NULL AFTER email"
            ))
            conn.commit()
        if _table_exists(conn, "registration_otps") and _column_exists(conn, "registration_otps", "otp_hash"):
            logger.info("Dropping registration_otps.otp_hash")
            conn.execute(text("DELETE FROM registration_otps"))
            conn.execute(text("ALTER TABLE registration_otps DROP COLUMN otp_hash"))
            conn.commit()

        logger.info("Schema migrations complete.")
        print("Schema migrations applied successfully.")

