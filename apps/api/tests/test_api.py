import asyncio
import os
from collections.abc import AsyncIterator
from datetime import date, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import get_db
from app.main import app
from app.models import Base

pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
async def client(tmp_path) -> AsyncIterator[AsyncClient]:
    database_url = os.getenv("TEST_DATABASE_URL", f"sqlite+aiosqlite:///{tmp_path}/test.db")
    engine = create_async_engine(database_url)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)

    async def database_override() -> AsyncIterator[AsyncSession]:
        async with sessions() as session:
            yield session

    app.dependency_overrides[get_db] = database_override
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as value:
        yield value
    app.dependency_overrides.clear()
    await engine.dispose()


async def register(client: AsyncClient, email: str = "user@example.com") -> dict[str, str]:
    response = await client.post("/auth/register", json={"email": email, "password": "password123"})
    assert response.status_code == 201
    return response.json()


def auth(pair: dict[str, str]) -> dict[str, str]:
    return {"Authorization": f"Bearer {pair['access_token']}"}


async def test_registration_login_rotation_reuse_and_logout(client: AsyncClient) -> None:
    pair = await register(client)
    duplicate = await client.post(
        "/auth/register", json={"email": "user@example.com", "password": "password123"}
    )
    assert duplicate.status_code == 409
    bad_login = await client.post(
        "/auth/login", json={"email": "user@example.com", "password": "not-the-password"}
    )
    assert bad_login.status_code == 401
    login = await client.post(
        "/auth/login", json={"email": "user@example.com", "password": "password123"}
    )
    assert login.status_code == 200

    rotated = await client.post("/auth/refresh", json={"refresh_token": pair["refresh_token"]})
    assert rotated.status_code == 200
    reused = await client.post("/auth/refresh", json={"refresh_token": pair["refresh_token"]})
    assert reused.status_code == 401
    current = rotated.json()
    assert (
        await client.post("/auth/logout", json={"refresh_token": current["refresh_token"]})
    ).status_code == 204
    assert (
        await client.post("/auth/refresh", json={"refresh_token": current["refresh_token"]})
    ).status_code == 401


async def onboard(
    client: AsyncClient, pair: dict[str, str], key: str = "onboarding-key"
) -> dict[str, object]:
    response = await client.post(
        "/onboarding",
        headers={**auth(pair), "Idempotency-Key": key},
        json={
            "currency": "RUB",
            "available_now": 100_000,
            "minimum_buffer": 10_000,
            "incomes": [],
            "expenses": [],
            "debts": [],
        },
    )
    assert response.status_code == 201
    return response.json()


async def test_onboarding_is_idempotent(client: AsyncClient) -> None:
    pair = await register(client)
    first = await onboard(client, pair)
    second = await onboard(client, pair)
    assert second == first
    conflict = await client.post(
        "/onboarding",
        headers={**auth(pair), "Idempotency-Key": "different-key"},
        json={"currency": "RUB", "available_now": 1, "minimum_buffer": 0},
    )
    assert conflict.status_code == 409


async def test_onboarding_replay_rejects_changed_payload(client: AsyncClient) -> None:
    pair = await register(client, "onboarding-replay@example.com")
    headers = {**auth(pair), "Idempotency-Key": "stable-onboarding-key"}
    original = {
        "currency": "RUB",
        "available_now": 100_000,
        "minimum_buffer": 10_000,
        "incomes": [],
        "expenses": [],
        "debts": [],
    }
    first = await client.post("/onboarding", headers=headers, json=original)
    replay = await client.post("/onboarding", headers=headers, json=original)
    changed = await client.post(
        "/onboarding", headers=headers, json={**original, "available_now": 200_000}
    )
    assert first.status_code == replay.status_code == 201
    assert replay.json() == first.json()
    assert changed.status_code == 409


async def test_one_off_income_is_excluded_from_monthly_cash_flow(client: AsyncClient) -> None:
    pair = await register(client, "one-off-income@example.com")
    due = (date.today() + timedelta(days=1)).isoformat()
    response = await client.post(
        "/onboarding",
        headers={**auth(pair), "Idempotency-Key": "one-off-income-onboarding"},
        json={
            "currency": "RUB",
            "available_now": 100_000,
            "minimum_buffer": 0,
            "incomes": [
                {
                    "name": "Зарплата",
                    "amount": 10_000,
                    "due_date": due,
                    "recurring": True,
                },
                {
                    "name": "Разовая продажа",
                    "amount": 50_000,
                    "due_date": due,
                    "recurring": False,
                },
            ],
            "expenses": [
                {
                    "name": "Аренда",
                    "amount": 3_000,
                    "due_date": due,
                    "recurring": True,
                }
            ],
        },
    )
    assert response.status_code == 201
    plan = (await client.get("/plan", headers=auth(pair))).json()
    assert plan["snapshot"]["monthly_free_cash_flow"] == 7_000


async def test_debt_crud_and_ownership(client: AsyncClient) -> None:
    owner = await register(client, "owner@example.com")
    stranger = await register(client, "stranger@example.com")
    await onboard(client, owner, "owner-onboarding")
    await onboard(client, stranger, "stranger-onboarding")
    payload = {
        "name": "Карта",
        "debt_type": "credit_card",
        "balance": 100_000,
        "currency": "RUB",
        "annual_rate_bps": 2500,
        "minimum_payment": 5_000,
        "due_day": 15,
    }
    created = await client.post(
        "/debts",
        headers={**auth(owner), "Idempotency-Key": "owner-debt-key"},
        json=payload,
    )
    assert created.status_code == 201
    debt_id = created.json()["id"]
    assert (await client.get(f"/debts/{debt_id}", headers=auth(stranger))).status_code == 404
    payload["balance"] = 90_000
    updated = await client.put(f"/debts/{debt_id}", headers=auth(owner), json=payload)
    assert updated.status_code == 200 and updated.json()["balance"] == 90_000
    assert (await client.delete(f"/debts/{debt_id}", headers=auth(stranger))).status_code == 404
    assert (await client.delete(f"/debts/{debt_id}", headers=auth(owner))).status_code == 204


async def test_transaction_idempotency(client: AsyncClient) -> None:
    pair = await register(client)
    onboarding = await onboard(client, pair)
    payload = {
        "account_id": onboarding["account_id"],
        "kind": "expense",
        "amount": 1_000,
        "currency": "RUB",
        "category": "food",
    }
    headers = {**auth(pair), "Idempotency-Key": "transaction-key"}
    first = await client.post("/transactions", headers=headers, json=payload)
    second = await client.post("/transactions", headers=headers, json=payload)
    assert first.status_code == second.status_code == 201
    items = (await client.get("/transactions", headers=auth(pair))).json()["items"]
    assert len(items) == 1


async def test_recurring_expense_affects_monthly_cash_flow(client: AsyncClient) -> None:
    pair = await register(client, "recurring@example.com")
    due = (date.today() + timedelta(days=1)).isoformat()
    response = await client.post(
        "/onboarding",
        headers={**auth(pair), "Idempotency-Key": "recurring-onboarding"},
        json={
            "currency": "RUB",
            "available_now": 100_000,
            "minimum_buffer": 0,
            "incomes": [{"name": "Доход", "amount": 10_000, "due_date": due, "recurring": True}],
            "expenses": [
                {"name": "Аренда", "amount": 3_000, "due_date": due, "recurring": True},
                {"name": "Ремонт", "amount": 1_000, "due_date": due, "recurring": False},
            ],
        },
    )
    assert response.status_code == 201
    plan = (await client.get("/plan", headers=auth(pair))).json()
    assert plan["snapshot"]["monthly_free_cash_flow"] == 7_000


async def test_validation_errors_are_json_serializable_422(client: AsyncClient) -> None:
    pair = await register(client, "validation@example.com")
    invalid_debt = {
        "name": "Ошибочный долг",
        "balance": 100,
        "annual_rate_bps": 0,
        "minimum_payment": 101,
        "due_day": 1,
    }
    onboarding_response = await client.post(
        "/onboarding",
        headers={**auth(pair), "Idempotency-Key": "validation-onboarding"},
        json={"currency": "RUB", "available_now": 0, "minimum_buffer": 0, "debts": [invalid_debt]},
    )
    assert onboarding_response.status_code == 422
    assert onboarding_response.json()["error"]["code"] == "validation_error"
    assert isinstance(onboarding_response.json()["error"]["details"], list)

    await onboard(client, pair, "valid-onboarding")
    debt_response = await client.post(
        "/debts",
        headers={**auth(pair), "Idempotency-Key": "invalid-debt-key"},
        json={**invalid_debt, "currency": "RUB", "debt_type": "credit"},
    )
    assert debt_response.status_code == 422
    assert debt_response.json()["error"]["code"] == "validation_error"


async def test_debt_create_idempotency_and_payload_conflict(client: AsyncClient) -> None:
    pair = await register(client, "idempotent-debt@example.com")
    await onboard(client, pair)
    payload = {
        "name": "Карта",
        "debt_type": "credit_card",
        "balance": 100_000,
        "currency": "RUB",
        "annual_rate_bps": 2500,
        "minimum_payment": 5_000,
        "due_day": 15,
    }
    headers = {**auth(pair), "Idempotency-Key": "stable-debt-key"}
    first = await client.post("/debts", headers=headers, json=payload)
    replay = await client.post("/debts", headers=headers, json=payload)
    assert first.status_code == replay.status_code == 201
    assert first.json()["id"] == replay.json()["id"]
    changed = await client.post("/debts", headers=headers, json={**payload, "balance": 200_000})
    assert changed.status_code == 409
    assert len((await client.get("/debts", headers=auth(pair))).json()) == 1


async def test_debt_idempotency_is_scoped_per_user_and_concurrent(client: AsyncClient) -> None:
    first_user = await register(client, "first-debt@example.com")
    second_user = await register(client, "second-debt@example.com")
    await onboard(client, first_user, "first-user-onboarding")
    await onboard(client, second_user, "second-user-onboarding")
    payload = {
        "name": "Долг",
        "debt_type": "personal",
        "balance": 10_000,
        "currency": "RUB",
        "annual_rate_bps": 0,
        "minimum_payment": 1_000,
        "due_day": 10,
    }
    key = "shared-debt-key"
    responses = await asyncio.gather(
        client.post("/debts", headers={**auth(first_user), "Idempotency-Key": key}, json=payload),
        client.post("/debts", headers={**auth(first_user), "Idempotency-Key": key}, json=payload),
    )
    assert [response.status_code for response in responses] == [201, 201]
    assert responses[0].json()["id"] == responses[1].json()["id"]
    other = await client.post(
        "/debts", headers={**auth(second_user), "Idempotency-Key": key}, json=payload
    )
    assert other.status_code == 201
    assert other.json()["id"] != responses[0].json()["id"]


@pytest.mark.parametrize("currency", ["RUB", "USD", "EUR"])
async def test_debt_uses_account_base_currency(client: AsyncClient, currency: str) -> None:
    pair = await register(client, f"currency-{currency.lower()}@example.com")
    response = await client.post(
        "/onboarding",
        headers={**auth(pair), "Idempotency-Key": f"onboarding-{currency.lower()}"},
        json={"currency": currency, "available_now": 1_000, "minimum_buffer": 0},
    )
    assert response.status_code == 201
    payload = {
        "name": "Debt",
        "debt_type": "credit",
        "balance": 100,
        "currency": currency,
        "annual_rate_bps": 0,
        "minimum_payment": 10,
        "due_day": 1,
    }
    created = await client.post(
        "/debts",
        headers={**auth(pair), "Idempotency-Key": f"debt-{currency.lower()}"},
        json=payload,
    )
    assert created.status_code == 201
    assert created.json()["currency"] == currency
    conflict_currency = "USD" if currency != "USD" else "EUR"
    conflict = await client.post(
        "/debts",
        headers={**auth(pair), "Idempotency-Key": f"conflict-{currency.lower()}"},
        json={**payload, "currency": conflict_currency},
    )
    assert conflict.status_code == 409
