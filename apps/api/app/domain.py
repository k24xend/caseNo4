from dataclasses import dataclass
from datetime import date, timedelta
from enum import StrEnum


class JourneyState(StrEnum):
    CRITICAL = "critical"
    STABILIZATION = "stabilization"
    EXIT = "exit"
    BUFFER = "buffer"
    GROWTH = "growth"


@dataclass(frozen=True)
class SnapshotInput:
    available_now: int
    confirmed_income: int
    mandatory_expenses: int
    minimum_debt_payments: int
    protected_reserve: int
    days_to_income: int
    monthly_income: int
    monthly_mandatory: int
    monthly_debt_minimums: int
    has_debts: bool
    has_overdue: bool


def calculate_snapshot(data: SnapshotInput) -> dict[str, int]:
    projected = (
        data.available_now
        + data.confirmed_income
        - data.mandatory_expenses
        - data.minimum_debt_payments
    )
    safe = max(0, projected - data.protected_reserve)
    days = max(1, data.days_to_income)
    return {
        "available_now": data.available_now,
        "mandatory_before_next_income": data.mandatory_expenses,
        "minimum_debt_payments_before_next_income": data.minimum_debt_payments,
        "projected_balance_before_next_income": projected,
        "safe_to_spend": safe,
        "safe_daily_amount": safe // days,
        "monthly_free_cash_flow": (
            data.monthly_income - data.monthly_mandatory - data.monthly_debt_minimums
        ),
        "minimum_buffer_target": data.protected_reserve,
    }


def classify(snapshot: dict[str, int], *, has_debts: bool, has_overdue: bool) -> JourneyState:
    if snapshot["projected_balance_before_next_income"] < 0:
        return JourneyState.CRITICAL
    if has_overdue:
        return JourneyState.STABILIZATION
    if not has_debts and snapshot["available_now"] < snapshot["minimum_buffer_target"]:
        return JourneyState.BUFFER
    if snapshot["available_now"] < snapshot["minimum_buffer_target"]:
        return JourneyState.STABILIZATION
    if has_debts:
        return JourneyState.EXIT
    if snapshot["available_now"] < snapshot["minimum_buffer_target"]:
        return JourneyState.BUFFER
    return JourneyState.GROWTH


def main_action(
    state: JourneyState, snapshot: dict[str, int], target_debt: str | None
) -> dict[str, object]:
    if state == JourneyState.CRITICAL:
        deficit = -snapshot["projected_balance_before_next_income"]
        return {"type": "review_expense", "amount": deficit, "title": "Закройте кассовый разрыв"}
    if state == JourneyState.STABILIZATION:
        needed = max(0, snapshot["minimum_buffer_target"] - snapshot["available_now"])
        return {"type": "build_buffer", "amount": needed, "title": "Защитите минимальный резерв"}
    if state == JourneyState.EXIT:
        return {
            "type": "pay_target_debt",
            "amount": max(0, snapshot["monthly_free_cash_flow"]),
            "title": f"Ускорьте погашение: {target_debt or 'целевой долг'}",
        }
    return {
        "type": "build_buffer",
        "amount": max(0, snapshot["monthly_free_cash_flow"]),
        "title": "Пополните подушку",
    }


@dataclass(frozen=True)
class DebtData:
    id: str
    name: str
    balance: int
    annual_rate_bps: int
    minimum_payment: int
    custom_priority: int = 0


def order_debts(debts: list[DebtData], strategy: str) -> list[DebtData]:
    if strategy == "avalanche":
        return sorted(debts, key=lambda d: (-d.annual_rate_bps, d.balance, d.id))
    if strategy == "snowball":
        return sorted(debts, key=lambda d: (d.balance, -d.annual_rate_bps, d.id))
    if strategy == "custom":
        return sorted(debts, key=lambda d: (d.custom_priority, d.id))
    raise ValueError(f"Unknown debt strategy: {strategy}")


def forecast_debts(
    debts: list[DebtData], extra_payment: int, strategy: str, start: date | None = None
) -> dict[str, object]:
    ordered = order_debts(debts, strategy)
    balances = {d.id: d.balance for d in ordered}
    total_paid = 0
    # The original minimum-payment envelope stays available after a debt is
    # closed. This is the deterministic "rollover" used by all strategies.
    monthly_envelope = sum(d.minimum_payment for d in ordered) + max(0, extra_payment)
    negative_amortization: list[str] = []
    for month in range(1, 361):
        active = [d for d in ordered if balances[d.id] > 0]
        if not active:
            origin = start or date.today()
            return {
                "strategy": strategy,
                "months": month - 1,
                "debt_free_date": (origin + timedelta(days=30 * (month - 1))).isoformat(),
                "total_paid": total_paid,
                "negative_amortization": negative_amortization,
                "order": [d.id for d in ordered],
            }
        remaining_envelope = monthly_envelope
        for debt in active:
            # Monthly nominal APR / 12, rounded half-up to one minor unit.
            interest = (balances[debt.id] * debt.annual_rate_bps + 60_000) // 120_000
            balances[debt.id] += interest
            payment = min(balances[debt.id], debt.minimum_payment, remaining_envelope)
            if debt.minimum_payment <= interest and debt.id not in negative_amortization:
                negative_amortization.append(debt.id)
            balances[debt.id] -= payment
            total_paid += payment
            remaining_envelope -= payment
        target = next((d for d in ordered if balances[d.id] > 0), None)
        if target:
            payment = min(balances[target.id], remaining_envelope)
            balances[target.id] -= payment
            total_paid += payment
    return {
        "strategy": strategy,
        "months": None,
        "debt_free_date": None,
        "total_paid": total_paid,
        "negative_amortization": negative_amortization,
        "order": [d.id for d in ordered],
    }
