"""Initial financial data model."""

from alembic import op
from app.models import Base

revision = "0001"
down_revision = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
