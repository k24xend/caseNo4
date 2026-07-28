import uuid
from datetime import UTC, date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
    version: Mapped[int] = mapped_column(Integer, default=1)


class User(TimestampMixin, Base):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    settings: Mapped["UserSettings"] = relationship(cascade="all, delete-orphan")


class UserSettings(TimestampMixin, Base):
    __tablename__ = "user_settings"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    language: Mapped[str] = mapped_column(String(2), default="ru")
    currency: Mapped[str] = mapped_column(String(3), default="RUB")
    minimum_buffer: Mapped[int] = mapped_column(Integer, default=0)
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False)


class Account(TimestampMixin, Base):
    __tablename__ = "accounts"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    balance: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3))


class ScheduledItem(TimestampMixin, Base):
    __tablename__ = "scheduled_items"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(30))
    name: Mapped[str] = mapped_column(String(100))
    amount: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3))
    due_date: Mapped[date] = mapped_column(Date)
    confirmed: Mapped[bool] = mapped_column(Boolean, default=True)
    recurring: Mapped[bool] = mapped_column(Boolean, default=False)


class Debt(TimestampMixin, Base):
    __tablename__ = "debts"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    debt_type: Mapped[str] = mapped_column(String(30), default="credit")
    balance: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3))
    annual_rate_bps: Mapped[int] = mapped_column(Integer, default=0)
    minimum_payment: Mapped[int] = mapped_column(Integer, default=0)
    due_day: Mapped[int] = mapped_column(Integer, default=1)
    overdue: Mapped[bool] = mapped_column(Boolean, default=False)
    custom_priority: Mapped[int] = mapped_column(Integer, default=0)


class Transaction(TimestampMixin, Base):
    __tablename__ = "transactions"
    __table_args__ = (UniqueConstraint("user_id", "idempotency_key"),)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(20))
    amount: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3))
    category: Mapped[str] = mapped_column(String(60))
    description: Mapped[str] = mapped_column(String(200), default="")
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    idempotency_key: Mapped[str] = mapped_column(String(100))


class Checkin(TimestampMixin, Base):
    __tablename__ = "weekly_checkins"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    actual_balance: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3))
    notes: Mapped[str] = mapped_column(String(500), default="")


class Scenario(TimestampMixin, Base):
    __tablename__ = "what_if_scenarios"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    changes: Mapped[dict[str, int]] = mapped_column(JSON)
    applied: Mapped[bool] = mapped_column(Boolean, default=False)


class IdempotencyRecord(TimestampMixin, Base):
    __tablename__ = "idempotency_records"
    __table_args__ = (UniqueConstraint("user_id", "scope", "key"),)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    scope: Mapped[str] = mapped_column(String(50))
    key: Mapped[str] = mapped_column(String(100))
    response: Mapped[dict[str, object]] = mapped_column(JSON)
