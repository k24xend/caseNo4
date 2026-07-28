from datetime import date

import pytest

from app.domain import (
    DebtData,
    JourneyState,
    SnapshotInput,
    add_calendar_months,
    calculate_snapshot,
    classify,
    forecast_debts,
    main_action,
)


def test_money_snapshot_is_integer_and_reserve_protected() -> None:
    result = calculate_snapshot(
        SnapshotInput(38_000, 62_000, 46_300, 9_500, 10_000, 10, 62_000, 46_300, 9_500, True, False)
    )
    assert result["projected_balance_before_next_income"] == 44_200
    assert result["safe_to_spend"] == 34_200
    assert result["safe_daily_amount"] == 3_420
    assert all(isinstance(v, int) for v in result.values())


@pytest.mark.parametrize(
    ("projected", "available", "buffer", "debts", "overdue", "expected"),
    [
        (-1, 10, 0, True, False, JourneyState.CRITICAL),
        (10, 5, 10, True, False, JourneyState.STABILIZATION),
        (10, 20, 10, True, True, JourneyState.STABILIZATION),
        (10, 20, 10, True, False, JourneyState.EXIT),
        (10, 5, 10, False, False, JourneyState.BUFFER),
        (10, 20, 10, False, False, JourneyState.GROWTH),
    ],
)
def test_classification(
    projected: int, available: int, buffer: int, debts: bool, overdue: bool, expected: JourneyState
) -> None:
    assert (
        classify(
            {
                "projected_balance_before_next_income": projected,
                "available_now": available,
                "minimum_buffer_target": buffer,
            },
            has_debts=debts,
            has_overdue=overdue,
        )
        == expected
    )


def test_avalanche_and_snowball_choose_different_targets() -> None:
    debts = [
        DebtData("high", "High", 100_000, 3500, 10_000),
        DebtData("small", "Small", 20_000, 0, 5_000),
    ]
    avalanche = forecast_debts(debts, 5_000, "avalanche", date(2026, 1, 1))
    snowball = forecast_debts(debts, 5_000, "snowball", date(2026, 1, 1))
    assert avalanche["order"][0] == "high"
    assert snowball["order"][0] == "small"
    assert avalanche["months"] is not None and snowball["months"] is not None


def test_negative_amortization_and_horizon() -> None:
    result = forecast_debts([DebtData("bad", "Bad", 1_000_000, 100_000, 1)], 0, "avalanche")
    assert "bad" in result["negative_amortization"]
    assert result["months"] is None


def test_custom_order_and_freed_payment_rollover() -> None:
    debts = [DebtData("large", "Large", 10_000, 0, 100, 2), DebtData("small", "Small", 100, 0, 100, 1)]
    result = forecast_debts(debts, 0, "custom", date(2026, 1, 1))
    assert result["order"] == ["small", "large"]
    assert result["months"] == 51


@pytest.mark.parametrize(("days", "expected"), [(0, 900), (1, 900), (2, 450)])
def test_daily_amount_date_boundaries(days: int, expected: int) -> None:
    result = calculate_snapshot(SnapshotInput(1_000, 0, 100, 0, 0, days, 0, 0, 0, False, False))
    assert result["safe_daily_amount"] == expected


def test_interest_rounds_half_up_in_minor_units() -> None:
    result = forecast_debts([DebtData("d", "Debt", 600, 10_000, 650)], 0, "avalanche", date(2024, 2, 29))
    assert result["months"] == 1
    assert result["total_paid"] == 650


def test_unknown_strategy_is_rejected() -> None:
    with pytest.raises(ValueError):
        forecast_debts([], 0, "magic")


@pytest.mark.parametrize(
    ("origin", "months", "expected"),
    [
        (date(2024, 1, 31), 1, date(2024, 2, 29)),
        (date(2025, 1, 31), 1, date(2025, 2, 28)),
        (date(2026, 12, 15), 1, date(2027, 1, 15)),
        (date(2026, 1, 1), 360, date(2056, 1, 1)),
    ],
)
def test_calendar_month_transition(origin: date, months: int, expected: date) -> None:
    assert add_calendar_months(origin, months) == expected


@pytest.mark.parametrize("extra", [0, 100, 100_000])
def test_zero_percent_debt_and_extra_payments(extra: int) -> None:
    result = forecast_debts(
        [DebtData("zero", "Zero", 10_000, 0, 1_000)], extra, "avalanche", date(2026, 1, 31)
    )
    assert result["total_paid"] == 10_000
    assert result["negative_amortization"] == []


def test_debt_can_close_in_current_month() -> None:
    result = forecast_debts(
        [DebtData("d", "Debt", 100, 0, 100)], 0, "avalanche", date(2026, 12, 31)
    )
    assert result["months"] == 1
    assert result["debt_free_date"] == "2026-12-31"


def test_negative_extra_payment_is_rejected() -> None:
    with pytest.raises(ValueError):
        forecast_debts([], -1, "avalanche")


def test_main_action_is_deterministic() -> None:
    action = main_action(
        JourneyState.CRITICAL,
        {
            "projected_balance_before_next_income": -500,
            "minimum_buffer_target": 0,
            "available_now": 0,
            "monthly_free_cash_flow": 0,
        },
        None,
    )
    assert action == {"type": "review_expense", "amount": 500, "title": "Закройте кассовый разрыв"}
