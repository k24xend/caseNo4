import asyncio
from typing import Protocol

from pydantic import ValidationError

from .schemas import AIExplanation


class AIProvider(Protocol):
    async def explain(self, context: dict[str, object]) -> dict[str, object]: ...


class FakeAIProvider:
    async def explain(self, context: dict[str, object]) -> dict[str, object]:
        action = context["action"]
        assert isinstance(action, dict)
        return {
            "headline": str(action["title"]),
            "explanation": "План рассчитан по подтверждённым данным. Вы можете изменить любую исходную запись.",
            "reasons": ["Сначала защищаем обязательные расходы", "Суммы рассчитаны без участия AI"],
            "next_steps": [
                {
                    "title": str(action["title"]),
                    "description": "Проверьте действие и отметьте его после выполнения",
                    "action_type": action["type"],
                }
            ],
            "uncertainties": [],
        }


def fallback(context: dict[str, object]) -> AIExplanation:
    action = context["action"]
    assert isinstance(action, dict)
    return AIExplanation.model_validate(
        {
            "headline": action["title"],
            "explanation": "Используется локальное объяснение: расчёт плана доступен полностью.",
            "reasons": ["AI временно недоступен"],
            "next_steps": [
                {
                    "title": action["title"],
                    "description": "Следуйте рассчитанному действию",
                    "action_type": action["type"],
                }
            ],
            "uncertainties": ["Автоматическое объяснение недоступно"],
        }
    )


async def safe_explanation(provider: AIProvider, context: dict[str, object]) -> AIExplanation:
    for attempt in range(2):
        try:
            raw = await asyncio.wait_for(provider.explain(context), timeout=2)
            return AIExplanation.model_validate(raw)
        except (TimeoutError, ValidationError, ValueError, TypeError):
            if attempt == 0:
                continue
    return fallback(context)
