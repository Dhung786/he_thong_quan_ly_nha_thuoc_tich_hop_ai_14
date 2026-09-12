"""Restore cashier as the third operational role.

Revision ID: 0007_restore_cashier_role
Revises: 0006_manager_operational_apis
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0007_restore_cashier_role"
down_revision: str | None = "0006_manager_operational_apis"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_roles_supported_name", "roles", type_="check")
    op.execute("UPDATE roles SET name = 'CASHIER' WHERE name = 'CUSTOMER'")
    op.create_check_constraint(
        "ck_roles_supported_name",
        "roles",
        "name IN ('MANAGER', 'PHARMACIST', 'CASHIER')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_roles_supported_name", "roles", type_="check")
    op.execute("UPDATE roles SET name = 'CUSTOMER' WHERE name = 'CASHIER'")
    op.create_check_constraint(
        "ck_roles_supported_name",
        "roles",
        "name IN ('MANAGER', 'PHARMACIST', 'CUSTOMER')",
    )
