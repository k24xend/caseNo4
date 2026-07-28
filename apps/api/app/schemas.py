from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class AuthIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class OnboardingIn(BaseModel):
    language: Literal["ru", "en"] = "ru"
    currency: str = "RUB"
    available_now: int = Field(ge=0)
    minimum_buffer: int = Field(ge=0)
    next_income_amount: int = Field(ge=0)
    next_income_date: date
    expenses: list[dict[str, object]] = []
    debts: list[dict[str, object]] = []

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
    name: str
    debt_type: str = "credit"
    balance: int = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3)
    annual_rate_bps: int = Field(ge=0, le=100_000)
    minimum_payment: int = Field(ge=0)
    due_day: int = Field(ge=1, le=31)
    overdue: bool = False
    custom_priority: int = 0


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
