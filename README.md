# 💰 Finance Tracker

A full-stack personal finance tracking application built with FastAPI and Next.js.

> Personal portfolio project — applying for junior software engineer roles.

## ✨ Features

- 🔐 **User authentication** with JWT tokens
- 💳 **Multiple accounts** (cash, bank, credit card, etc.)
- 📝 **Transaction management** — add, edit, delete, categorize
- 🏷️ **Custom categories** with icons and colors
- 📊 **Monthly statistics** and interactive charts
- 🔍 **Search & filter** transactions by date, category, amount
- 📤 **CSV export** for tax season
- 💰 **Budget setting** with overspending alerts
- 📱 **Responsive design** — works on mobile

## 🛠️ Tech Stack

**Backend**
- FastAPI (Python 3.11+)
- SQLAlchemy 2.0 + Alembic (migrations)
- PostgreSQL (production) / SQLite (dev)
- Pydantic v2 for validation
- JWT authentication
- pytest for testing

**Frontend**
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query (data fetching)
- Recharts (visualizations)
- React Hook Form + Zod (forms & validation)

**DevOps**
- Docker for backend containerization
- Backend deployed on Railway / Fly.io
- Frontend deployed on Vercel
- Database on Neon (free Postgres)

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│                 │  HTTPS  │                  │   SQL   │              │
│   Next.js App   │ ──────► │  FastAPI Server  │ ──────► │  PostgreSQL  │
│   (Vercel)      │  REST   │  (Railway)       │         │  (Neon)      │
│                 │ ◄────── │                  │ ◄────── │              │
└─────────────────┘  JSON   └──────────────────┘         └──────────────┘
```

## 🚀 Getting Started

See [SETUP.md](./SETUP.md) for step-by-step setup instructions.

## 📂 Project Structure

```
finance-tracker/
├── backend/                 # FastAPI server
│   ├── app/
│   │   ├── main.py         # FastAPI entry point
│   │   ├── database.py     # DB connection
│   │   ├── models.py       # SQLAlchemy models
│   │   ├── schemas.py      # Pydantic schemas
│   │   ├── auth.py         # JWT auth helpers
│   │   ├── config.py       # Settings
│   │   └── routers/        # API endpoints
│   │       ├── auth.py
│   │       ├── accounts.py
│   │       ├── transactions.py
│   │       └── categories.py
│   ├── tests/
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/                # Next.js app (created via create-next-app)
│
├── README.md
├── SETUP.md                 # First-time setup guide
└── ROADMAP.md               # Development checklist
```

## 📷 Screenshots

_Coming soon — will be added once UI is built._

## 🎯 Roadmap

See [ROADMAP.md](./ROADMAP.md) for the development plan with milestone-by-milestone checklist.

## 📄 License

MIT
