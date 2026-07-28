import os
from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import get_db
from app.main import app
from app.models import Base


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
    created = await client.post("/debts", headers=auth(owner), json=payload)
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
