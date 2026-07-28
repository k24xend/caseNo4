"""Add an exact next payment date to debts."""

import sqlalchemy as sa

from alembic import op

revision = "0003"
down_revision = "0002"


def upgrade() -> None:
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("debts")}
    if "next_payment_date" not in columns:
        op.add_column("debts", sa.Column("next_payment_date", sa.Date(), nullable=True))


def downgrade() -> None:
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("debts")}
    if "next_payment_date" in columns:
        op.drop_column("debts", "next_payment_date")
