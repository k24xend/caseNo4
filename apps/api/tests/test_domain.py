from datetime import date

import pytest

from app.domain import (
    DebtData,
    JourneyState,
    SnapshotInput,
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
