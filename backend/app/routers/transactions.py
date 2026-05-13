"""Transaction CRUD + statistics endpoints."""
from collections import defaultdict
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Account, Category, Transaction, TransactionType, User
from app.schemas import (
    CategoryStats,
    MonthlyStats,
    TransactionCreate,
    TransactionOut,
    TransactionUpdate,
)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _verify_account(account_id: int, user: User, db: Session) -> Account:
    account = db.get(Account, account_id)
    if account is None or account.user_id != user.id:
        raise HTTPException(status_code=400, detail="Invalid account_id")
    return account


def _verify_category(category_id: int | None, user: User, db: Session) -> None:
    if category_id is None:
        return
    category = db.get(Category, category_id)
    if category is None or category.user_id != user.id:
        raise HTTPException(status_code=400, detail="Invalid category_id")


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    start: date | None = Query(None, description="Inclusive start date"),
    end: date | None = Query(None, description="Inclusive end date"),
    account_id: int | None = None,
    category_id: int | None = None,
    type: TransactionType | None = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Transaction).where(Transaction.user_id == user.id)
    if start:
        stmt = stmt.where(Transaction.occurred_on >= start)
    if end:
        stmt = stmt.where(Transaction.occurred_on <= end)
    if account_id is not None:
        stmt = stmt.where(Transaction.account_id == account_id)
    if category_id is not None:
        stmt = stmt.where(Transaction.category_id == category_id)
    if type is not None:
        stmt = stmt.where(Transaction.type == type)
    stmt = stmt.order_by(Transaction.occurred_on.desc(), Transaction.id.desc())
    stmt = stmt.offset(offset).limit(limit)
    return db.scalars(stmt).all()


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    account = _verify_account(payload.account_id, user, db)
    _verify_category(payload.category_id, user, db)

    txn = Transaction(**payload.model_dump(), user_id=user.id)
    db.add(txn)

    # Keep account balance in sync. Income adds, expense subtracts.
    delta = payload.amount if payload.type == TransactionType.income else -payload.amount
    account.balance = (account.balance or Decimal("0")) + delta

    db.commit()
    db.refresh(txn)
    return txn


def _get_owned_txn(txn_id: int, user: User, db: Session) -> Transaction:
    txn = db.get(Transaction, txn_id)
    if txn is None or txn.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return txn


@router.patch("/{txn_id}", response_model=TransactionOut)
def update_transaction(
    txn_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    txn = _get_owned_txn(txn_id, user, db)

    # Reverse the old effect on account balance.
    old_account = db.get(Account, txn.account_id)
    old_delta = txn.amount if txn.type == TransactionType.income else -txn.amount
    if old_account:
        old_account.balance = (old_account.balance or Decimal("0")) - old_delta

    data = payload.model_dump(exclude_unset=True)
    if "account_id" in data:
        _verify_account(data["account_id"], user, db)
    if "category_id" in data:
        _verify_category(data["category_id"], user, db)

    for field, value in data.items():
        setattr(txn, field, value)

    # Apply the new effect.
    new_account = db.get(Account, txn.account_id)
    new_delta = txn.amount if txn.type == TransactionType.income else -txn.amount
    if new_account:
        new_account.balance = (new_account.balance or Decimal("0")) + new_delta

    db.commit()
    db.refresh(txn)
    return txn


@router.delete("/{txn_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    txn_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    txn = _get_owned_txn(txn_id, user, db)
    account = db.get(Account, txn.account_id)
    if account:
        delta = txn.amount if txn.type == TransactionType.income else -txn.amount
        account.balance = (account.balance or Decimal("0")) - delta
    db.delete(txn)
    db.commit()


@router.get("/stats/monthly", response_model=MonthlyStats)
def monthly_stats(
    month: str = Query(..., description="Format: YYYY-MM"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        year, mon = map(int, month.split("-"))
        start = date(year, mon, 1)
        end = date(year + (mon == 12), 1 if mon == 12 else mon + 1, 1)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid month format, expected YYYY-MM")

    stmt = select(Transaction).where(
        Transaction.user_id == user.id,
        Transaction.occurred_on >= start,
        Transaction.occurred_on < end,
    )
    txns = db.scalars(stmt).all()

    income = sum((t.amount for t in txns if t.type == TransactionType.income), Decimal("0"))
    expense = sum((t.amount for t in txns if t.type == TransactionType.expense), Decimal("0"))

    by_cat: dict[int | None, dict] = defaultdict(lambda: {"total": Decimal("0"), "count": 0, "name": "Uncategorized"})
    cat_names = {c.id: c.name for c in db.scalars(select(Category).where(Category.user_id == user.id)).all()}

    for t in txns:
        if t.type != TransactionType.expense:
            continue
        entry = by_cat[t.category_id]
        entry["total"] += t.amount
        entry["count"] += 1
        if t.category_id is not None and t.category_id in cat_names:
            entry["name"] = cat_names[t.category_id]

    by_category = [
        CategoryStats(
            category_id=cid,
            category_name=v["name"],
            total=v["total"],
            count=v["count"],
        )
        for cid, v in sorted(by_cat.items(), key=lambda kv: kv[1]["total"], reverse=True)
    ]

    return MonthlyStats(
        month=month,
        income=income,
        expense=expense,
        net=income - expense,
        by_category=by_category,
    )
