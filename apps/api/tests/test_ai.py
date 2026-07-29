import asyncio

import pytest

from app.ai import safe_explanation

pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


class Invalid:
    async def explain(self, context):
        return {"headline": "bad"}


class Slow:
    async def explain(self, context):
        await asyncio.sleep(3)
        return {}


class Valid:
    async def explain(self, context):
        action = context["action"]
        return {
            "headline": action["title"],
            "explanation": "Deterministic values are only being explained.",
            "reasons": ["The plan already selected this priority"],
            "next_steps": [
                {
                    "title": action["title"],
                    "description": "Follow the plan",
                    "action_type": action["type"],
                }
            ],
            "uncertainties": [],
        }


async def test_invalid_ai_uses_schema_checked_fallback() -> None:
    result = await safe_explanation(
        Invalid(), {"action": {"title": "Проверить", "type": "review_expense"}}
    )
    assert result.uncertainties


async def test_valid_provider_cannot_mutate_authoritative_context() -> None:
    context = {
        "state": "exit",
        "snapshot": {"safe_to_spend": 12345},
        "action": {"title": "Pay debt", "type": "pay_target_debt"},
    }
    before = repr(context)
    result = await safe_explanation(Valid(), context)
    assert result.next_steps[0].action_type == "pay_target_debt"
    assert repr(context) == before


async def test_timeout_uses_deterministic_fallback(monkeypatch) -> None:
    original = asyncio.wait_for

    async def immediate_timeout(awaitable, timeout):
        awaitable.close()
        raise TimeoutError

    monkeypatch.setattr(asyncio, "wait_for", immediate_timeout)
    result = await safe_explanation(
        Slow(), {"action": {"title": "Review", "type": "review_expense"}}
    )
    assert result.headline == "Review"
    monkeypatch.setattr(asyncio, "wait_for", original)
