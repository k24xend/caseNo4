"""Initial financial data model."""

from alembic import op
from app.models import Base

revision = "0001"
down_revision = None


def upgrade() -> None:
    bind = op.get_bind()
    for table in Base.metadata.sorted_tables:
        if table.name not in {"refresh_sessions", "financial_snapshots"}:
            table.create(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
