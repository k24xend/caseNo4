from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, ValidationInfo, field_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class AuthIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshIn(BaseModel):
    refresh_token: str = Field(min_length=20)


class IncomeIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    amount: int = Field(gt=0)
    due_date: date
    confirmed: bool = True
    recurring: bool = False


class ExpenseIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    amount: int = Field(gt=0)
    due_date: date
    recurring: bool = False


class OnboardingDebtIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    balance: int = Field(gt=0)
    annual_rate_bps: int = Field(ge=0, le=100_000)
    minimum_payment: int = Field(ge=0)
    due_day: int = Field(ge=1, le=31)
    overdue: bool = False
    custom_priority: int = Field(default=0, ge=0)

    @field_validator("minimum_payment")
    @classmethod
    def minimum_not_above_balance(cls, value: int, info: ValidationInfo) -> int:
        balance = info.data.get("balance")
        if balance is not None and value > balance:
            raise ValueError("minimum payment cannot exceed debt balance")
        return value


class OnboardingIn(BaseModel):
    language: Literal["ru", "en"] = "ru"
    currency: str = "RUB"
    available_now: int = Field(ge=0)
    minimum_buffer: int = Field(ge=0)
    incomes: list[IncomeIn] = Field(default_factory=list)
    expenses: list[ExpenseIn] = Field(default_factory=list)
    debts: list[OnboardingDebtIn] = Field(default_factory=list)

    @field_validator("currency")
    @classmethod
    def currency_code(cls, value: str) -> str:
        value = value.upper()
        if len(value) != 3 or not value.isalpha():
            raise ValueError("currency must be an ISO 4217 alpha-3 code")
        return value


class TransactionIn(BaseModel):
    account_id: str
    kind: Literal["income", "expense", "transfer", "debt_payment"]
    amount: int = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3)
    category: str = Field(min_length=1, max_length=60)
    description: str = Field(default="", max_length=200)
    occurred_at: datetime | None = None


class DebtIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    debt_type: Literal["credit", "credit_card", "installment", "personal", "other"] = "credit"
    balance: int = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3)
    annual_rate_bps: int = Field(ge=0, le=100_000)
    minimum_payment: int = Field(ge=0)
    due_day: int = Field(ge=1, le=31)
    overdue: bool = False
    custom_priority: int = Field(default=0, ge=0)

    @field_validator("currency")
    @classmethod
    def debt_currency(cls, value: str) -> str:
        if not value.isalpha():
            raise ValueError("currency must be an ISO 4217 alpha-3 code")
        return value.upper()

    @field_validator("minimum_payment")
    @classmethod
    def debt_minimum_not_above_balance(cls, value: int, info: ValidationInfo) -> int:
        balance = info.data.get("balance")
        if balance is not None and value > balance:
            raise ValueError("minimum payment cannot exceed debt balance")
        return value


class CheckinIn(BaseModel):
    actual_balance: int = Field(ge=0)
    currency: str = Field(min_length=3, max_length=3)
    notes: str = Field(default="", max_length=500)


class ScenarioIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    changes: dict[Literal["income", "mandatory_expense", "extra_debt_payment"], int]


class NextStep(BaseModel):
    title: str
    description: str
    action_type: Literal[
        "review_expense", "confirm_income", "pay_mandatory", "build_buffer", "pay_target_debt"
    ]


class AIExplanation(BaseModel):
    headline: str
    explanation: str
    reasons: list[str]
    next_steps: list[NextStep]
    uncertainties: list[str]
