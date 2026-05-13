"""Pydantic schemas — request/response validation."""
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import AccountType, TransactionType


# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str | None
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Account ----------
class AccountBase(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    type: AccountType
    balance: Decimal = Decimal("0.00")
    currency: str = Field(default="USD", min_length=3, max_length=3)


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: str | None = None
    type: AccountType | None = None
    balance: Decimal | None = None
    currency: str | None = None


class AccountOut(AccountBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# ---------- Category ----------
class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    type: TransactionType
    icon: str | None = None
    color: str | None = None


class CategoryCreate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# ---------- Transaction ----------
class TransactionBase(BaseModel):
    account_id: int
    category_id: int | None = None
    type: TransactionType
    amount: Decimal = Field(gt=0)
    note: str | None = None
    occurred_on: date


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    account_id: int | None = None
    category_id: int | None = None
    type: TransactionType | None = None
    amount: Decimal | None = Field(default=None, gt=0)
    note: str | None = None
    occurred_on: date | None = None


class TransactionOut(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# ---------- Stats ----------
class CategoryStats(BaseModel):
    category_id: int | None
    category_name: str
    total: Decimal
    count: int


class MonthlyStats(BaseModel):
    month: str  # YYYY-MM
    income: Decimal
    expense: Decimal
    net: Decimal
    by_category: list[CategoryStats]
