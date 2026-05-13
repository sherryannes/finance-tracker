"""FastAPI application entry point."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.config import settings
from app.database import Base, engine
from app.routers import accounts, auth, categories, transactions

# For dev convenience: auto-create tables. In production, use Alembic migrations.
Base.metadata.create_all(bind=engine)


def ensure_schema_updates() -> None:
    """Tiny hand-rolled migration runner.

    Adds columns introduced after the initial schema, so existing dev databases
    keep working without dropping data. Replace with Alembic for production.
    """
    inspector = inspect(engine)
    txn_columns = {c["name"] for c in inspector.get_columns("transactions")}
    if "receipt_url" not in txn_columns:
        with engine.begin() as conn:
            conn.execute(
                text("ALTER TABLE transactions ADD COLUMN receipt_url VARCHAR(500)")
            )


ensure_schema_updates()


# Where uploaded receipts live on disk.
UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)


app = FastAPI(
    title="Finance Tracker API",
    description="Personal finance tracking — built for portfolio.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded receipts at /uploads/<filename>.
# In production this would be served by a CDN (S3/Cloudflare R2/etc).
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(categories.router)
app.include_router(transactions.router)
