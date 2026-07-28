from datetime import UTC, date, datetime, timedelta
from typing import Annotated, cast

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .ai import FakeAIProvider, safe_explanation
from .auth import current_user, hash_password, tokens, verify_password
from .config import get_settings
from .database import engine, get_db
from .domain import (
    DebtData,
    SnapshotInput,
    calculate_snapshot,
    classify,
    forecast_debts,
    main_action,
    order_debts,
)
from .models import (
    Account,
    Base,
    Checkin,
    Debt,
    FinancialSnapshot,
    IdempotencyRecord,
    RefreshSession,
    Scenario,
    ScheduledItem,
    Transaction,
    User,
    UserSettings,
)
from .schemas import (
    AuthIn,
    CheckinIn,
    DebtIn,
    OnboardingIn,
    RefreshIn,
    ScenarioIn,
    TokenPair,
    TransactionIn,
)

app = FastAPI(title="ВЫХОД API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": f"http_{exc.status_code}", "message": exc.detail}},
    )


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "validation_error",
                "message": "Request validation failed",
                "details": exc.errors(),
            }
        },
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready")
async def ready(db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    await db.execute(select(1))
    return {"status": "ready"}


@app.post("/auth/register", response_model=TokenPair, status_code=201)
async def register(body: AuthIn, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    if await db.scalar(select(User).where(User.email == body.email.lower())):
        raise HTTPException(409, "Email already registered")
    user = User(email=body.email.lower(), password_hash=hash_password(body.password))
    db.add(user)
    await db.flush()
    db.add(UserSettings(user_id=user.id))
    await db.commit()
    return await tokens(user.id, db)


@app.post("/auth/login", response_model=TokenPair)
async def login(body: AuthIn, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    user = await db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return await tokens(user.id, db)


@app.post("/auth/refresh", response_model=TokenPair)
async def refresh(body: RefreshIn, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    try:
        payload = jwt.decode(body.refresh_token, get_settings().jwt_secret, algorithms=["HS256"])
        if payload["type"] != "refresh":
            raise ValueError
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise HTTPException(401, "Invalid refresh token") from exc
    session = await db.scalar(
        select(RefreshSession).where(
            RefreshSession.token_id == payload["jti"],
            RefreshSession.user_id == payload["sub"],
            RefreshSession.revoked.is_(False),
            RefreshSession.expires_at > datetime.now(UTC),
        )
    )
    if not session:
        raise HTTPException(401, "Refresh token was revoked")
    session.revoked = True
    return await tokens(payload["sub"], db)


@app.post("/auth/logout", status_code=204)
async def logout(body: RefreshIn, db: AsyncSession = Depends(get_db)) -> None:
    try:
        payload = jwt.decode(body.refresh_token, get_settings().jwt_secret, algorithms=["HS256"])
        if payload.get("type") != "refresh":
            return
        session = await db.scalar(
            select(RefreshSession).where(
                RefreshSession.token_id == payload.get("jti"),
                RefreshSession.user_id == payload.get("sub"),
            )
        )
        if session:
            session.revoked = True
            await db.commit()
    except jwt.PyJWTError:
        return


UserDep = Annotated[User, Depends(current_user)]
DbDep = Annotated[AsyncSession, Depends(get_db)]


@app.post("/onboarding", status_code=201)
async def onboarding(
    body: OnboardingIn,
    user: UserDep,
    db: DbDep,
    idempotency_key: Annotated[str, Header()] = "onboarding",
) -> dict[str, object]:
    existing_request = await db.scalar(
        select(IdempotencyRecord).where(
            IdempotencyRecord.user_id == user.id,
            IdempotencyRecord.scope == "onboarding",
            IdempotencyRecord.key == idempotency_key,
        )
    )
    if existing_request:
        return existing_request.response
    account = await db.scalar(select(Account).where(Account.user_id == user.id))
    if account:
        raise HTTPException(409, "Onboarding was already completed")
    settings = await db.scalar(select(UserSettings).where(UserSettings.user_id == user.id))
    assert settings
    settings.language, settings.currency, settings.minimum_buffer, settings.onboarding_complete = (
        body.language,
        body.currency,
        body.minimum_buffer,
        True,
    )
    account = Account(
        user_id=user.id, name="Основной", balance=body.available_now, currency=body.currency
    )
    db.add(account)
    for item in body.incomes:
        db.add(
            ScheduledItem(
                user_id=user.id, kind="income", currency=body.currency, **item.model_dump()
            )
        )
    for item in body.expenses:
        db.add(
            ScheduledItem(
                user_id=user.id,
                kind="expense",
                name=item.name,
                amount=item.amount,
                currency=body.currency,
                due_date=item.due_date,
                recurring=item.recurring,
            )
        )
    for item in body.debts:
        db.add(
            Debt(
                user_id=user.id,
                currency=body.currency,
                **item.model_dump(),
            )
        )
    await db.flush()
    response: dict[str, object] = {
        "completed": True,
        "account_id": account.id,
        "idempotency_key": idempotency_key,
    }
    db.add(
        IdempotencyRecord(
            user_id=user.id, scope="onboarding", key=idempotency_key, response=response
        )
    )
    await db.commit()
    return response


async def build_plan(
    user: User, db: AsyncSession, overrides: dict[str, int] | None = None
) -> dict[str, object]:
    settings = await db.scalar(select(UserSettings).where(UserSettings.user_id == user.id))
    assert settings
    accounts = list((await db.scalars(select(Account).where(Account.user_id == user.id))).all())
    if any(a.currency != settings.currency for a in accounts):
        raise HTTPException(409, "Multiple currencies cannot be combined")
    today = date.today()
    incomes = list(
        (
            await db.scalars(
                select(ScheduledItem).where(
                    ScheduledItem.user_id == user.id,
                    ScheduledItem.kind == "income",
                    ScheduledItem.confirmed.is_(True),
                    ScheduledItem.due_date >= today,
                )
            )
        ).all()
    )
    next_income = min(incomes, key=lambda x: x.due_date) if incomes else None
    horizon = next_income.due_date if next_income else today + timedelta(days=7)
    expenses = list(
        (
            await db.scalars(
                select(ScheduledItem).where(
                    ScheduledItem.user_id == user.id,
                    ScheduledItem.kind == "expense",
                    ScheduledItem.due_date <= horizon,
                    ScheduledItem.due_date >= today,
                )
            )
        ).all()
    )
    debts = list((await db.scalars(select(Debt).where(Debt.user_id == user.id))).all())
    available = sum(a.balance for a in accounts)
    eligible_incomes = [x for x in incomes if x.due_date <= horizon]
    income = sum(x.amount for x in eligible_incomes)
    mandatory = sum(x.amount for x in expenses)

    def debt_due_before_horizon(debt: Debt) -> bool:
        day = min(debt.due_day, 28)
        due = date(today.year, today.month, day)
        if due < today:
            following = today.replace(day=1) + timedelta(days=32)
            due = date(following.year, following.month, day)
        return due <= horizon

    minimums = sum(d.minimum_payment for d in debts if debt_due_before_horizon(d))
    overrides = overrides or {}
    income += overrides.get("income", 0)
    mandatory += overrides.get("mandatory_expense", 0)
    data = SnapshotInput(
        available,
        sum(x.amount for x in incomes if x.due_date < today + timedelta(days=31)),
        sum(x.amount for x in expenses if x.recurring),
        sum(d.minimum_payment for d in debts),
        settings.minimum_buffer,
        (horizon - today).days,
        income,
        mandatory,
        minimums,
        bool(debts),
        any(d.overdue for d in debts),
    )
    snap = calculate_snapshot(data)
    state = classify(snap, has_debts=bool(debts), has_overdue=data.has_overdue)
    debt_data = [
        DebtData(d.id, d.name, d.balance, d.annual_rate_bps, d.minimum_payment, d.custom_priority)
        for d in debts
    ]
    target = order_debts(debt_data, "avalanche")[0].name if debt_data else None
    action = main_action(state, snap, target)
    forecasts = (
        {
            s: forecast_debts(
                debt_data,
                max(0, snap["monthly_free_cash_flow"] + overrides.get("extra_debt_payment", 0)),
                s,
            )
            for s in ("avalanche", "snowball", "custom")
        }
        if debts
        else {}
    )
    result = {
        "state": state,
        "currency": settings.currency,
        "snapshot": snap,
        "next_income_date": horizon.isoformat() if next_income else None,
        "income_confirmed": bool(next_income),
        "action": action,
        "debt_forecasts": forecasts,
        "generated_at": datetime.now(UTC).isoformat(),
        "calculation_version": 1,
    }
    db.add(
        FinancialSnapshot(
            user_id=user.id, currency=settings.currency, state=str(state), values=result
        )
    )
    await db.commit()
    return result


@app.get("/plan")
async def plan(user: UserDep, db: DbDep) -> dict[str, object]:
    return await build_plan(user, db)


@app.get("/plan/explanation")
async def explanation(user: UserDep, db: DbDep) -> object:
    context = await build_plan(user, db)
    return await safe_explanation(FakeAIProvider(), context)


@app.get("/accounts")
async def accounts(user: UserDep, db: DbDep) -> list[Account]:
    return list((await db.scalars(select(Account).where(Account.user_id == user.id))).all())


@app.get("/income")
async def income(user: UserDep, db: DbDep) -> list[ScheduledItem]:
    return list(
        (
            await db.scalars(
                select(ScheduledItem).where(
                    ScheduledItem.user_id == user.id, ScheduledItem.kind == "income"
                )
            )
        ).all()
    )


@app.get("/expenses")
async def expenses(user: UserDep, db: DbDep) -> list[ScheduledItem]:
    return list(
        (
            await db.scalars(
                select(ScheduledItem).where(
                    ScheduledItem.user_id == user.id, ScheduledItem.kind == "expense"
                )
            )
        ).all()
    )


@app.post("/transactions", status_code=201)
async def create_transaction(
    body: TransactionIn,
    user: UserDep,
    db: DbDep,
    idempotency_key: Annotated[str, Header(min_length=8, max_length=100)],
) -> Transaction:
    existing = await db.scalar(
        select(Transaction).where(
            Transaction.user_id == user.id, Transaction.idempotency_key == idempotency_key
        )
    )
    if existing:
        return existing
    account = await db.scalar(
        select(Account).where(Account.id == body.account_id, Account.user_id == user.id)
    )
    if not account:
        raise HTTPException(404, "Account not found")
    if account.currency != body.currency.upper():
        raise HTTPException(409, "Currency mismatch")
    delta = body.amount if body.kind == "income" else -body.amount
    if account.balance + delta < 0:
        raise HTTPException(422, "Insufficient account balance")
    account.balance += delta
    account.version += 1
    tx = Transaction(
        user_id=user.id, idempotency_key=idempotency_key, **body.model_dump(exclude_none=True)
    )
    tx.currency = tx.currency.upper()
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return tx


@app.get("/transactions")
async def transactions(
    user: UserDep,
    db: DbDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    kind: str | None = None,
    search: str | None = None,
) -> dict[str, object]:
    query = select(Transaction).where(Transaction.user_id == user.id)
    if kind:
        query = query.where(Transaction.kind == kind)
    if search:
        query = query.where(Transaction.description.ilike(f"%{search}%"))
    items = list(
        (
            await db.scalars(
                query.order_by(Transaction.occurred_at.desc()).limit(limit).offset(offset)
            )
        ).all()
    )
    return {"items": items, "limit": limit, "offset": offset}


@app.delete("/transactions/{transaction_id}", status_code=204)
async def delete_transaction(transaction_id: str, user: UserDep, db: DbDep) -> None:
    tx = await db.scalar(
        select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == user.id)
    )
    if not tx:
        raise HTTPException(404, "Transaction not found")
    account = await db.scalar(
        select(Account).where(Account.id == tx.account_id, Account.user_id == user.id)
    )
    assert account
    account.balance += -tx.amount if tx.kind == "income" else tx.amount
    await db.delete(tx)
    await db.commit()


@app.get("/debts")
async def debts(user: UserDep, db: DbDep) -> list[Debt]:
    return list((await db.scalars(select(Debt).where(Debt.user_id == user.id))).all())


@app.post("/debts", status_code=201)
async def add_debt(body: DebtIn, user: UserDep, db: DbDep) -> Debt:
    settings = await db.scalar(select(UserSettings).where(UserSettings.user_id == user.id))
    if not settings or body.currency != settings.currency:
        raise HTTPException(409, "Debt currency must match the base currency")
    debt = Debt(user_id=user.id, **body.model_dump())
    debt.currency = debt.currency.upper()
    db.add(debt)
    await db.commit()
    await db.refresh(debt)
    return debt


@app.get("/debts/{debt_id}")
async def get_debt(debt_id: str, user: UserDep, db: DbDep) -> Debt:
    debt = await db.scalar(select(Debt).where(Debt.id == debt_id, Debt.user_id == user.id))
    if not debt:
        raise HTTPException(404, "Debt not found")
    return debt


@app.put("/debts/{debt_id}")
async def update_debt(debt_id: str, body: DebtIn, user: UserDep, db: DbDep) -> Debt:
    debt = await get_debt(debt_id, user, db)
    settings = await db.scalar(select(UserSettings).where(UserSettings.user_id == user.id))
    if not settings or body.currency != settings.currency:
        raise HTTPException(409, "Debt currency must match the base currency")
    for field, value in body.model_dump().items():
        setattr(debt, field, value)
    debt.version += 1
    await db.commit()
    await db.refresh(debt)
    return debt


@app.delete("/debts/{debt_id}", status_code=204)
async def delete_debt(debt_id: str, user: UserDep, db: DbDep) -> None:
    debt = await get_debt(debt_id, user, db)
    await db.delete(debt)
    await db.commit()


@app.post("/checkins", status_code=201)
async def checkin(body: CheckinIn, user: UserDep, db: DbDep) -> dict[str, object]:
    account = await db.scalar(
        select(Account).where(Account.user_id == user.id, Account.currency == body.currency.upper())
    )
    if not account:
        raise HTTPException(409, "Currency mismatch")
    account.balance = body.actual_balance
    account.version += 1
    item = Checkin(user_id=user.id, **body.model_dump())
    db.add(item)
    await db.commit()
    return await build_plan(user, db)


@app.post("/scenarios", status_code=201)
async def scenario(body: ScenarioIn, user: UserDep, db: DbDep) -> dict[str, object]:
    item = Scenario(user_id=user.id, name=body.name, changes=body.changes)
    db.add(item)
    await db.commit()
    result = await build_plan(user, db, cast(dict[str, int], body.changes))
    return {"scenario_id": item.id, "applied": False, "result": result}


@app.get("/export")
async def export(user: UserDep, db: DbDep, format: str = "json") -> object:
    data = {
        "accounts": [a.__dict__ for a in await accounts(user, db)],
        "transactions": (await transactions(user, db, 100, 0))["items"],
        "debts": [d.__dict__ for d in await debts(user, db)],
    }
    if format != "json":
        raise HTTPException(422, "CSV export is available per entity; use format=json")
    for values in data.values():
        for value in values:
            value.pop("_sa_instance_state", None)
    return data


@app.get("/me")
async def me(user: UserDep, db: DbDep) -> dict[str, object]:
    settings = await db.scalar(select(UserSettings).where(UserSettings.user_id == user.id))
    return {"id": user.id, "email": user.email, "settings": settings}


@app.delete("/me", status_code=204)
async def delete_me(user: UserDep, db: DbDep) -> None:
    await db.delete(user)
    await db.commit()


@app.on_event("startup")
async def sqlite_bootstrap() -> None:
    if get_settings().database_url.startswith("sqlite"):
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
