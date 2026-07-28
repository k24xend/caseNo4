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


async def test_invalid_ai_uses_schema_checked_fallback() -> None:
    result = await safe_explanation(
        Invalid(), {"action": {"title": "Проверить", "type": "review_expense"}}
    )
    assert result.uncertainties
