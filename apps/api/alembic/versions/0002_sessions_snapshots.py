"""Add rotating refresh sessions and versioned financial snapshots."""
from alembic import op
from app.models import Base

revision = "0002"
down_revision = "0001"


def upgrade() -> None:
    bind = op.get_bind()
    for name in ("refresh_sessions", "financial_snapshots"):
        Base.metadata.tables[name].create(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    for name in ("financial_snapshots", "refresh_sessions"):
        Base.metadata.tables[name].drop(bind=bind)
