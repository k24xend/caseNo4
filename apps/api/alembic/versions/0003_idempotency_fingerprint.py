"""Add request fingerprint for safe idempotency replay."""

import sqlalchemy as sa

from alembic import op

revision = "0003"
down_revision = "0002"


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("idempotency_records")}
    if "request_fingerprint" not in columns:
        op.add_column(
            "idempotency_records",
            sa.Column("request_fingerprint", sa.String(length=64), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("idempotency_records")}
    if "request_fingerprint" in columns:
        op.drop_column("idempotency_records", "request_fingerprint")
