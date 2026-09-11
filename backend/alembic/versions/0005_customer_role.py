"""Replace cashier role with customer by user-approved decision.

Revision ID: 0005_customer_role
Revises: 0004_pharmacy_srs_baseline
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0005_customer_role"
down_revision: str | None = "0004_pharmacy_srs_baseline"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("ck_roles_supported_name", "roles", type_="check")
    op.execute("UPDATE roles SET name = 'CUSTOMER' WHERE name = 'CASHIER'")
    op.create_check_constraint(
        "ck_roles_supported_name",
        "roles",
        "name IN ('MANAGER', 'PHARMACIST', 'CUSTOMER')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_roles_supported_name", "roles", type_="check")
    op.execute("UPDATE roles SET name = 'CASHIER' WHERE name = 'CUSTOMER'")
    op.create_check_constraint(
        "ck_roles_supported_name",
        "roles",
        "name IN ('MANAGER', 'PHARMACIST', 'CASHIER')",
    )
