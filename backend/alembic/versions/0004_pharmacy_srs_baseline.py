"""Adopt pharmacy SRS roles and UC002 medicine catalog schema.

Revision ID: 0004_pharmacy_srs_baseline
Revises: 0003_idempotency_infrastructure
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_pharmacy_srs_baseline"
down_revision: str | None = "0003_idempotency_infrastructure"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_roles_supported_name", "roles", type_="check")
    op.execute("UPDATE roles SET name = 'MANAGER' WHERE name = 'ADMIN'")
    op.execute("UPDATE roles SET name = 'PHARMACIST' WHERE name = 'WAREHOUSE_KEEPER'")
    op.execute("UPDATE roles SET name = 'CASHIER' WHERE name = 'ACCOUNTANT'")
    op.create_check_constraint(
        "ck_roles_supported_name",
        "roles",
        "name IN ('MANAGER', 'PHARMACIST', 'CASHIER')",
    )

    op.create_table(
        "medicine_groups",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_medicine_groups_name", "medicine_groups", ["name"])

    op.create_table(
        "units",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_units_name", "units", ["name"])

    op.create_table(
        "medicines",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("unit_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["group_id"], ["medicine_groups.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_medicines_code"),
    )
    op.create_index("ix_medicines_name", "medicines", ["name"])
    op.create_index("ix_medicines_group_id", "medicines", ["group_id"])
    op.create_index("ix_medicines_unit_id", "medicines", ["unit_id"])


def downgrade() -> None:
    op.drop_index("ix_medicines_unit_id", table_name="medicines")
    op.drop_index("ix_medicines_group_id", table_name="medicines")
    op.drop_index("ix_medicines_name", table_name="medicines")
    op.drop_table("medicines")
    op.drop_index("ix_units_name", table_name="units")
    op.drop_table("units")
    op.drop_index("ix_medicine_groups_name", table_name="medicine_groups")
    op.drop_table("medicine_groups")

    op.drop_constraint("ck_roles_supported_name", "roles", type_="check")
    op.execute("UPDATE roles SET name = 'ADMIN' WHERE name = 'MANAGER'")
    op.execute("UPDATE roles SET name = 'WAREHOUSE_KEEPER' WHERE name = 'PHARMACIST'")
    op.execute("UPDATE roles SET name = 'ACCOUNTANT' WHERE name = 'CASHIER'")
    op.create_check_constraint(
        "ck_roles_supported_name",
        "roles",
        "name IN ('ADMIN', 'WAREHOUSE_KEEPER', 'ACCOUNTANT')",
    )
