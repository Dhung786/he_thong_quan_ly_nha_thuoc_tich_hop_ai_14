"""Seed a default cashier account for local development.

Revision ID: 0008_seed_cashier_account
Revises: 0007_restore_cashier_role
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0008_seed_cashier_account"
down_revision: str | None = "0007_restore_cashier_role"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


CASHIER_PASSWORD_HASH = "$argon2id$v=19$m=65536,t=3,p=4$VQtsjVuFa6gsCbSgaErR6w$Hf4d2eoTrG8+URAF2FrkdVw2Hw3izyR+UknVmSkFm74"


def upgrade() -> None:
    op.execute(
        f"""
        INSERT INTO users (username, password_hash, role_id, is_active)
        SELECT 'cashier', '{CASHIER_PASSWORD_HASH}', r.id, true
        FROM roles r
        WHERE r.name = 'CASHIER'
          AND NOT EXISTS (SELECT 1 FROM users u WHERE u.username = 'cashier')
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM users WHERE username = 'cashier'")
