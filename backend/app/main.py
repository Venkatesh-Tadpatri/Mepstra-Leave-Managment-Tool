from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.db.database import engine, Base
from app.models import models  # ensure models are imported before create_all
from app.api.routes import auth, users, leaves, holidays, departments, dashboard, allowed_emails, wfh
from app.db.seed import seed_data
from app.db.migrate import run_migrations
import os


def ensure_database_exists():
    """Auto-create MySQL database if it doesn't exist."""
    url = settings.DATABASE_URL
    if "mysql" in url:
        import pymysql
        # Parse connection details from URL
        # Format: mysql+pymysql://user:password@host:port/dbname
        parts = url.replace("mysql+pymysql://", "")
        user_pass, rest = parts.split("@", 1)
        host_port, dbname = rest.rsplit("/", 1)
        user, password = user_pass.split(":", 1)
        host, port = (host_port.split(":") + ["3306"])[:2]
        try:
            conn = pymysql.connect(
                host=host, port=int(port), user=user, password=password
            )
            cursor = conn.cursor()
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{dbname}` "
                f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
            conn.commit()
            cursor.close()
            conn.close()
            print(f"Database '{dbname}' ready.")
        except Exception as e:
            print(f"Could not create database: {e}")
            raise


ensure_database_exists()

# Create DB tables (new tables only)
Base.metadata.create_all(bind=engine)

# Apply column-level migrations to existing tables
run_migrations()

from fastapi.openapi.utils import get_openapi
from fastapi.security import OAuth2PasswordBearer

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    swagger_ui_oauth2_redirect_url="/api/docs/oauth2-redirect",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Routes
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(leaves.router, prefix="/api")
app.include_router(holidays.router, prefix="/api")
app.include_router(departments.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(allowed_emails.router, prefix="/api")
app.include_router(wfh.router, prefix="/api")


@app.on_event("startup")
def startup():
    seed_data()


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}
