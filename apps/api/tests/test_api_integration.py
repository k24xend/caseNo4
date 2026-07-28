import uuid
from datetime import date, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from app.database import SessionLocal
from app.main import app
from app.models import FinancialSnapshot, User


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_auth_onboarding_plan_rotation_ownership_and_delete_cascade() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        email = f"integration-{uuid.uuid4()}@vyhod.app"
        credentials = {"email": email, "password": "correct-horse-battery"}
        registered = await client.post("/auth/register", json=credentials)
        assert registered.status_code == 201
        duplicate = await client.post("/auth/register", json=credentials)
        assert duplicate.status_code == 409
        login = await client.post("/auth/login", json=credentials)
        assert login.status_code == 200
        pair = login.json()
        headers = auth(pair["access_token"])
        future = (date.today() + timedelta(days=10)).isoformat()
        payload = {
            "currency": "RUB", "available_now": 100_000, "minimum_buffer": 10_000,
            "incomes": [
                {"name": "Contract", "amount": 50_000, "due_date": future, "confirmed": True, "recurring": False},
                {"name": "Possible", "amount": 900_000, "due_date": future, "confirmed": False, "recurring": False},
            ],
            "expenses": [
                {"name": "Rent", "amount": 20_000, "due_date": future, "recurring": True},
                {"name": "Utilities", "amount": 5_000, "due_date": future, "recurring": False},
            ],
            "debts": [
                {"name": "Card", "debt_type": "credit_card", "balance": 40_000, "annual_rate_bps": 2400, "minimum_payment": 2_000, "due_day": 15},
                {"name": "Loan", "debt_type": "loan", "balance": 80_000, "annual_rate_bps": 1200, "minimum_payment": 3_000, "due_day": 20},
            ],
        }
        first = await client.post("/onboarding", json=payload, headers={**headers, "Idempotency-Key": "stable-onboarding-key"})
        assert first.status_code == 201
        repeated = await client.post("/onboarding", json=payload, headers={**headers, "Idempotency-Key": "stable-onboarding-key"})
        assert repeated.status_code == 201 and repeated.json() == first.json()
        different_key = await client.post("/onboarding", json=payload, headers={**headers, "Idempotency-Key": "different-onboarding-key"})
        assert different_key.status_code == 409
        assert len((await client.get("/income", headers=headers)).json()) == 2
        assert len((await client.get("/expenses", headers=headers)).json()) == 2
        assert len((await client.get("/debts", headers=headers)).json()) == 2
        plan = await client.get("/plan", headers=headers)
        assert plan.status_code == 200
        assert plan.json()["snapshot"]["safe_to_spend"] < 900_000

        other_email = f"other-{uuid.uuid4()}@vyhod.app"
        other = (await client.post("/auth/register", json={"email": other_email, "password": "correct-horse-battery"})).json()
        account_id = first.json()["account_id"]
        forbidden = await client.post("/transactions", headers={**auth(other["access_token"]), "Idempotency-Key": "ownership-attempt"}, json={"account_id": account_id, "kind": "expense", "amount": 1, "currency": "RUB", "category": "test"})
        assert forbidden.status_code == 404

        rotated = await client.post("/auth/refresh", json={"refresh_token": pair["refresh_token"]})
        assert rotated.status_code == 200
        reused = await client.post("/auth/refresh", json={"refresh_token": pair["refresh_token"]})
        assert reused.status_code == 401
        new_pair = rotated.json()
        assert (await client.post("/auth/logout", json={"refresh_token": new_pair["refresh_token"]})).status_code == 204
        assert (await client.post("/auth/refresh", json={"refresh_token": new_pair["refresh_token"]})).status_code == 401

        async with SessionLocal() as db:
            user_id = await db.scalar(select(User.id).where(User.email == email))
            assert await db.scalar(select(func.count()).select_from(FinancialSnapshot).where(FinancialSnapshot.user_id == user_id)) == 1
        assert (await client.delete("/me", headers=headers)).status_code == 204
        async with SessionLocal() as db:
            assert await db.scalar(select(User).where(User.email == email)) is None
            assert await db.scalar(select(func.count()).select_from(FinancialSnapshot).where(FinancialSnapshot.user_id == user_id)) == 0
