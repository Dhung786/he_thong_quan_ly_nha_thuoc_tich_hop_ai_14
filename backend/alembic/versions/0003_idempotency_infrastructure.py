"""Create technical idempotency infrastructure.

Revision ID: 0003_idempotency_infrastructure
Revises: 0002_auth_foundation
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_idempotency_infrastructure"
down_revision: str | None = "0002_auth_foundation"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "idempotency_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("scope", sa.String(length=100), nullable=False),
        sa.Column("idempotency_key", sa.String(length=200), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "status",
            sa.String(length=16),
            server_default="IN_PROGRESS",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('IN_PROGRESS', 'COMPLETED')",
            name="ck_idempotency_records_status",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "scope",
            "idempotency_key",
            name="uq_idempotency_records_scope_key",
        ),
    )
    op.create_index(
        "ix_idempotency_records_created_at",
        "idempotency_records",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_idempotency_records_created_at",
        table_name="idempotency_records",
    )
    op.drop_table("idempotency_records")
