# Mepstra Leave Management Tool — Project Structure Guide
> For Deployment Engineers


## Quick Overview

| Item | Detail |
|------|--------|
| Project Name | Mepstra Leave Management |
| Architecture | Monorepo — Frontend + Backend in one repo |
| Backend Framework | FastAPI (Python) |
| Frontend Framework | React 18 + Vite |
| Database | MySQL (production) / SQLite (local dev) |
| Auth | JWT Token (Bearer) |


## Top-Level Folder Layout

Mepsrta leave tool/               ← Project root
├── backend/                      ← Python FastAPI backend
├── frontend/                     ← React + Vite frontend
├── start-backend.bat             ← Windows script to run backend
├── start-frontend.bat            ← Windows script to run frontend
├── .gitignore
└── README.md
```


## BACKEND

### Location

backend/

### How to Start (Development)
```bash
cd backend
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux / Mac
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### How to Start (Production)
bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4


### Default Ports
| Service | Port |
|---------|------|
| Backend API | `8000` |
| Swagger Docs (API explorer) | `http://<host>:8000/api/docs` |
| ReDoc | `http://<host>:8000/api/redoc` |
| Health Check | `http://<host>:8000/api/health` |



### Backend Folder Structure


backend/
├── app/                          ← Main application package
│   ├── main.py                   ← ★ App entry point — FastAPI app created here
│   │                               Routes are registered here
│   │
│   ├── api/                      ← All API route definitions
│   │   ├── deps.py               ← Shared dependencies (get_current_user, etc.)
│   │   └── routes/               ← ★ This is equivalent to urls.py in Django
│   │       ├── auth.py           →  /api/auth/*       (login, register, OTP)
│   │       ├── users.py          →  /api/users/*      (profile, employees)
│   │       ├── leaves.py         →  /api/leaves/*     (apply, approve, balance)
│   │       ├── wfh.py            →  /api/wfh/*        (work from home requests)
│   │       ├── holidays.py       →  /api/holidays/*   (holiday calendar)
│   │       ├── departments.py    →  /api/departments/* (department management)
│   │       ├── dashboard.py      →  /api/dashboard/*  (stats, reports)
│   │       └── allowed_emails.py →  /api/allowed-emails/* (email whitelist)
│   │
│   ├── core/
│   │   ├── config.py             ← ★ All settings/env variables loaded here
│   │   └── security.py           ← JWT token creation and verification
│   │
│   ├── db/
│   │   ├── database.py           ← Database engine and session setup
│   │   ├── seed.py               ← Seeds initial admin/data on first run
│   │   ├── migrate.py            ← Column-level migrations (auto-run on startup)
│   │   └── seed_data.json        ← Default seed data (holidays, etc.)
│   │
│   ├── models/
│   │   └── models.py             ← ★ All database table definitions (SQLAlchemy ORM)
│   │                               Tables: User, LeaveRequest, LeaveBalance,
│   │                               Holiday, Department, WFHRequest, AllowedEmail
│   │
│   ├── schemas/
│   │   └── schemas.py            ← Pydantic request/response schemas (validation)
│   │
│   └── services/
│       ├── email_service.py      ← Sends email notifications (SMTP)
│       └── leave_service.py      ← Leave calculation business logic
│
├── alembic/                      ← Database migration tool config
│   └── env.py                    ← Alembic environment (points to same DB)
├── alembic.ini                   ← Alembic config file
│
├── uploads/                      ← ★ User profile photo uploads stored here
│   └── profiles/                 ← Served at /uploads/profiles/<filename>
│
├── .env                          ← ★ Environment variables (DO NOT commit this)
├── .env.example                  ← Template for .env
├── requirements.txt              ← Python dependencies
├── venv/                         ← Python virtual environment (do not deploy)
├── create_db.sql                 ← SQL to manually create MySQL database
└── tests/                        ← Test folder
```

---

### Environment Variables (backend/.env)

```env
# JWT
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440          # 24 hours

# Database — change to MySQL for production
DATABASE_URL=sqlite:///./Mepstra_leave.db
# MySQL example:
# DATABASE_URL=mysql+pymysql://user:password@localhost:3306/mepstra_leave

# Email (SMTP) — needed for OTP and leave notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password           # Gmail App Password
EMAILS_FROM_EMAIL=noreply@yourcompany.com
EMAILS_FROM_NAME=Mepstra Leave Management

# CORS — add your frontend domain here (comma-separated)
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com

# Company
COMPANY_NAME=Mepstra Technologies
```

---

### Key Backend Files — Quick Reference

| Question | Answer |
|----------|--------|
| Where is the app entry point? | `backend/app/main.py` |
| Where are all the URL routes registered? | `backend/app/main.py` (include_router calls) |
| Where are individual route handlers? | `backend/app/api/routes/*.py` |
| Django's urls.py equivalent? | `backend/app/api/routes/` folder |
| Django's models.py equivalent? | `backend/app/models/models.py` |
| Django's settings.py equivalent? | `backend/app/core/config.py` |
| Where is the database config? | `backend/app/db/database.py` |
| Where are environment variables? | `backend/.env` |
| How to install dependencies? | `pip install -r requirements.txt` |
| How to run? | `uvicorn app.main:app --host 0.0.0.0 --port 8000` |
| Where are uploaded files stored? | `backend/uploads/profiles/` |

---

### All API Endpoints Summary

All routes are prefixed with `/api`

| Prefix | File | Purpose |
|--------|------|---------|
| `POST /api/auth/login` | routes/auth.py | Login |
| `POST /api/auth/register` | routes/auth.py | Register user |
| `POST /api/auth/send-otp` | routes/auth.py | Send OTP email |
| `POST /api/auth/verify-otp` | routes/auth.py | Verify OTP |
| `GET/PUT /api/users/me` | routes/users.py | My profile |
| `GET /api/users` | routes/users.py | All employees |
| `GET /api/users/managers` | routes/users.py | All managers |
| `POST /api/leaves` | routes/leaves.py | Apply for leave |
| `GET /api/leaves` | routes/leaves.py | List leaves |
| `PUT /api/leaves/{id}/action` | routes/leaves.py | Approve/Reject |
| `GET /api/leaves/balance` | routes/leaves.py | Leave balance |
| `POST /api/wfh` | routes/wfh.py | Apply WFH |
| `PATCH /api/wfh/{id}` | routes/wfh.py | Approve/Reject WFH |
| `GET /api/holidays` | routes/holidays.py | List holidays |
| `GET /api/departments` | routes/departments.py | List departments |
| `GET /api/dashboard/stats` | routes/dashboard.py | Dashboard data |
| `GET /api/allowed-emails` | routes/allowed_emails.py | Email whitelist |
| `GET /api/health` | main.py | Health check |

---

## FRONTEND

### Location
```
frontend/
```

### How to Build (Production)
```bash
cd frontend
npm install
npm run build           # Output goes to frontend/dist/
```

### How to Run (Development)
```bash
cd frontend
npm install
npm run dev             # Runs at http://localhost:5173
```

### Default Ports
| Service | Port |
|---------|------|
| Dev server | `5173` |
| Production (after build) | Serve `dist/` folder via Nginx / any static server |

---

### Frontend Folder Structure

```
frontend/
├── index.html                    ← HTML entry point
├── vite.config.js                ← Vite build configuration
├── tailwind.config.js            ← Tailwind CSS configuration
├── package.json                  ← NPM dependencies and scripts
├── .env                          ← Frontend environment variables
│
├── public/                       ← Static assets (copied as-is to dist)
│   ├── mepstra-logo.png
│   └── mep-icon.svg
│
├── dist/                         ← ★ Production build output (deploy this folder)
│   ├── index.html
│   └── assets/
│       ├── index-*.js            ← Bundled JavaScript
│       └── index-*.css           ← Bundled CSS
│
└── src/                          ← All source code
    ├── main.jsx                  ← React app entry point
    ├── App.jsx                   ← Root component, all routes defined here
    ├── App.css / index.css       ← Global styles
    │
    ├── services/
    │   └── api.js                ← ★ SINGLE FILE for all API calls
    │                               Change BASE_URL here when deploying
    │                               BASE_URL = "http://localhost:8000/api"
    │
    ├── apiconfig/
    │   └── api.js                ← Re-exports from services/api.js
    │
    ├── pages/                    ← One file per page/screen
    │   ├── LoginPage.jsx         → /login
    │   ├── RegisterPage.jsx      → /register
    │   ├── DashboardPage.jsx     → /dashboard
    │   ├── ApplyLeavePage.jsx    → /apply-leave
    │   ├── LeavesPage.jsx        → /leaves
    │   ├── PendingApprovalsPage.jsx → /pending-approvals
    │   ├── CalendarPage.jsx      → /calendar
    │   ├── WFHPage.jsx           → /wfh
    │   ├── AdminWFHPage.jsx      → /admin-wfh
    │   ├── ProfilePage.jsx       → /profile
    │   ├── EmployeesPage.jsx     → /employees
    │   ├── DepartmentsPage.jsx   → /departments
    │   ├── HolidaysPage.jsx      → /holidays
    │   ├── UpdateHolidaysPage.jsx → /update-holidays
    │   └── AllowedEmailsPage.jsx → /allowed-emails
    │
    ├── components/               ← Reusable UI components
    │   └── common/
    │       ├── Header.jsx        ← Top navigation bar
    │       ├── Sidebar.jsx       ← Left sidebar navigation
    │       ├── Layout.jsx        ← Page wrapper (Header + Sidebar)
    │       └── CookieConsent.jsx ← Cookie consent banner
    │
    ├── store/                    ← Redux state management
    │   ├── store.js              ← Redux store setup
    │   └── slices/
    │       ├── authSlice.js      ← Login/logout state
    │       ├── leaveSlice.js     ← Leave data state
    │       └── uiSlice.js        ← UI state (modals, loading)
    │
    ├── contexts/                 ← React context providers
    ├── utils/                    ← Helper/utility functions
    └── assets/                   ← Images, SVGs used in code
```

---

### Key Frontend Files — Quick Reference

| Question | Answer |
|----------|--------|
| Where is the API base URL? | `frontend/src/services/api.js` — line 8 (`BASE_URL`) |
| Where are all API calls defined? | `frontend/src/services/api.js` |
| Where are page routes defined? | `frontend/src/App.jsx` |
| Where is the production build? | `frontend/dist/` (after `npm run build`) |
| What to deploy for frontend? | The entire `frontend/dist/` folder |
| How to change backend URL for production? | Edit `BASE_URL` in `frontend/src/services/api.js`, rebuild |

---

## DEPLOYMENT CHECKLIST

### Backend
- [ ] Set `DATABASE_URL` in `backend/.env` to production MySQL URL
- [ ] Set a strong `SECRET_KEY` in `backend/.env`
- [ ] Set `SMTP_*` variables for email to work
- [ ] Set `ALLOWED_ORIGINS` to include the production frontend URL
- [ ] Run `pip install -r requirements.txt`
- [ ] Start with: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4`
- [ ] Make sure `backend/uploads/` folder is writable (profile photos)

### Frontend
- [ ] Update `BASE_URL` in `frontend/src/services/api.js` to production backend URL
  ```js
  // Line 8 in frontend/src/services/api.js
  const BASE_URL = "https://api.yourdomain.com/api";
  ```
- [ ] Run `npm install && npm run build`
- [ ] Deploy the `frontend/dist/` folder to Nginx / Apache / CDN
- [ ] Configure Nginx to serve `dist/index.html` for all routes (SPA routing)

### Nginx Config Example
```nginx
# Frontend (React SPA)
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/mepstra/frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;   # Required for React Router
    }
}

# Backend (FastAPI)
server {
    listen 80;
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /uploads/ {
        alias /var/www/mepstra/backend/uploads/;  # Serve uploaded files
    }
}
```

---

## TECH STACK SUMMARY

### Backend
| Library | Version | Purpose |
|---------|---------|---------|
| FastAPI | 0.135.3 | Web framework (like Django REST) |
| Uvicorn | 0.43.0 | ASGI server (runs FastAPI) |
| SQLAlchemy | 2.0.49 | ORM (database queries) |
| Alembic | 1.18.4 | Database migrations |
| PyMySQL | 1.1.2 | MySQL driver |
| Pydantic | 2.12.5 | Request/response validation |
| python-jose | 3.5.0 | JWT token handling |
| passlib + bcrypt | — | Password hashing |
| python-dotenv | 1.2.2 | .env file loading |
| aiosmtplib | 5.1.0 | Async email sending |
| Pillow | 12.2.0 | Image processing (avatar upload) |

### Frontend
| Library | Version | Purpose |
|---------|---------|---------|
| React | 18.3.1 | UI framework |
| Vite | 5.4.10 | Build tool / dev server |
| React Router | 6.30.3 | Client-side routing |
| Redux Toolkit | 2.11.2 | Global state management |
| Axios | 1.14.0 | HTTP requests to backend |
| Tailwind CSS | 3.4.19 | CSS utility framework |
| FullCalendar | 6.1.20 | Leave calendar view |
| Recharts | 3.8.1 | Dashboard charts |
| React Hook Form | 7.72.1 | Form handling |
| Zod | 4.3.6 | Form validation |
| Framer Motion | 12.38.0 | Animations |
| React Hot Toast | 2.6.0 | Toast notifications |
