# Mepstra Leave Management Tool

A full-stack leave management portal built with **FastAPI** (Python) and **React + Vite** (TypeScript/JS).

---

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React 18, Vite, Tailwind CSS, Redux Toolkit, Framer Motion |
| Backend   | FastAPI, SQLAlchemy, SQLite, Pydantic, Alembic  |
| Auth      | JWT (python-jose), bcrypt (passlib)             |
| Email     | SMTP via Gmail                                  |

---

## Project Structure

```
Mepstra-Leave-Managment-Tool/
├── backend/
│   ├── app/
│   │   ├── api/          # API utilities
│   │   ├── core/         # Config, security
│   │   ├── db/           # Database setup, seed, migrations
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── routers/      # FastAPI route handlers
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── services/     # Business logic
│   │   └── main.py       # FastAPI app entry point
│   ├── alembic/          # Database migration scripts
│   ├── uploads/          # User file uploads
│   ├── .env.example      # Environment variable template
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/   # Shared UI components
│   │   ├── pages/        # Page-level components
│   │   ├── store/        # Redux slices
│   │   └── services/     # API service layer
│   ├── public/           # Static assets (logo, icons)
│   ├── index.html
│   └── package.json
├── start-backend.bat     # Windows quick-start for backend
├── start-frontend.bat    # Windows quick-start for frontend
└── README.md
```

---

## Getting Started

### Prerequisites

- **Python 3.10+** — [Download](https://www.python.org/downloads/)
- **Node.js 18+** — [Download](https://nodejs.org/)
- **Git** — [Download](https://git-scm.com/)

---

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Venkatesh-Tadpatri/Mepstra-Leave-Managment-Tool.git
cd Mepstra-Leave-Managment-Tool
```

---

### 2. Backend Setup

#### 2a. Create and activate a virtual environment

```bash
cd backend

# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

#### 2b. Install Python dependencies

```bash
pip install -r requirements.txt
```

#### 2c. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

DATABASE_URL=sqlite:///./Mepstra_leave.db

# SMTP Email (optional — leave empty to disable emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
EMAILS_FROM_EMAIL=noreply@mepstra.com
EMAILS_FROM_NAME=Mepstra Leave Management

COMPANY_NAME=Mepstra Technologies
APP_URL=http://localhost:5173
```

> **Gmail App Password**: Enable 2FA on your Google account, then generate an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

#### 2d. Initialize the database and seed data

```bash
python -m app.db.database      # creates tables
python -m app.db.seed          # seeds initial data (admin user, departments, etc.)
```

#### 2e. Start the backend server

```bash
uvicorn app.main:app --reload --port 8000
```

Backend runs at: **http://localhost:8000**  
API docs: **http://localhost:8000/docs**

---

### 3. Frontend Setup

Open a new terminal:

#### 3a. Install Node dependencies

```bash
cd frontend
npm install
```

#### 3b. Configure environment variables

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api
```

#### 3c. Start the frontend dev server

```bash
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## Quick Start (Windows)

Double-click from the project root:

- `start-backend.bat` — activates venv and starts FastAPI
- `start-frontend.bat` — starts the Vite dev server

---

## Default Admin Credentials

After seeding, log in with the admin account created in `backend/app/db/seed.py`.  
Check that file for the default email and PIN.

---

## Available Scripts

### Backend

| Command | Description |
|---------|-------------|
| `uvicorn app.main:app --reload` | Start dev server |
| `python -m app.db.seed` | Seed the database |
| `alembic upgrade head` | Run latest migration |
| `alembic revision --autogenerate -m "msg"` | Generate new migration |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Yes | JWT signing secret (change in production) |
| `DATABASE_URL` | Yes | SQLite path or PostgreSQL URL |
| `SMTP_USER` | No | Gmail address for sending emails |
| `SMTP_PASSWORD` | No | Gmail app password |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Base URL of the backend API |

---

## Features

- Multi-step employee registration with OTP email verification
- Role-based access: Admin, Manager, HR, Team Lead, Employee
- Leave application with multi-level approval workflow
- Live leave balance tracking
- Holiday calendar management
- Department and employee management
- Real-time email notifications
- Mepstra branding throughout

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

This project is proprietary to **Mepstra Technologies**. All rights reserved.
