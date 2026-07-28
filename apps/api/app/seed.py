import asyncio
from datetime import date, timedelta

from sqlalchemy import select

from .auth import hash_password
from .database import SessionLocal, engine
from .models import Account, Base, Debt, ScheduledItem, User, UserSettings


async def seed() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with SessionLocal() as db:
        if await db.scalar(select(User).where(User.email == "demo@vyhod.app")):
            return
        user = User(email="demo@vyhod.app", password_hash=hash_password("demo-vyhod"), is_demo=True)
        db.add(user)
        await db.flush()
        db.add(
            UserSettings(
                user_id=user.id,
                language="ru",
                currency="RUB",
                minimum_buffer=1_000_000,
                onboarding_complete=True,
            )
        )
        db.add(Account(user_id=user.id, name="Основной", balance=3_800_000, currency="RUB"))
        today = date.today()
        next_fifth = date(today.year + (today.month == 12), today.month % 12 + 1, 5)
        db.add(
            ScheduledItem(
                user_id=user.id,
                kind="income",
                name="Доход",
                amount=6_200_000,
                currency="RUB",
                due_date=next_fifth,
                confirmed=True,
                recurring=True,
            )
        )
        for name, amount, days in [
            ("Аренда", 2_600_000, 2),
            ("Связь и интернет", 130_000, 4),
            ("Транспорт", 400_000, 6),
            ("Продукты", 1_500_000, 8),
        ]:
            db.add(
                ScheduledItem(
                    user_id=user.id,
                    kind="expense",
                    name=name,
                    amount=amount,
                    currency="RUB",
                    due_date=today + timedelta(days=days),
                    recurring=True,
                )
            )
        for name, balance, rate, minimum, priority in [
            ("Кредитная карта", 8_400_000, 3490, 550_000, 1),
            ("Рассрочка", 2_800_000, 0, 400_000, 2),
            ("Частный долг", 2_000_000, 0, 0, 3),
        ]:
            db.add(
                Debt(
                    user_id=user.id,
                    name=name,
                    balance=balance,
                    currency="RUB",
                    annual_rate_bps=rate,
                    minimum_payment=minimum,
                    custom_priority=priority,
                    due_day=15,
                )
            )
        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed())
