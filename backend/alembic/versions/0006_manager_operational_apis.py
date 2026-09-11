"""Add manager operational tables for suppliers, batches and invoices.

Revision ID: 0006_manager_operational_apis
Revises: 0005_customer_role
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_manager_operational_apis"
down_revision: str | None = "0005_customer_role"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "suppliers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_suppliers_name"),
    )
    op.create_index("ix_suppliers_name", "suppliers", ["name"])

    op.create_table(
        "medicine_batches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("medicine_id", sa.Integer(), nullable=False),
        sa.Column("supplier_id", sa.Integer(), nullable=False),
        sa.Column("quantity_received", sa.Integer(), nullable=False),
        sa.Column("quantity_remaining", sa.Integer(), nullable=False),
        sa.Column("received_date", sa.Date(), nullable=False),
        sa.Column("expiry_date", sa.Date(), nullable=False),
        sa.Column("purchase_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("selling_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("quantity_received > 0", name="ck_batches_quantity_received_positive"),
        sa.CheckConstraint("quantity_remaining >= 0", name="ck_batches_quantity_remaining_nonnegative"),
        sa.CheckConstraint("purchase_price >= 0", name="ck_batches_purchase_price_nonnegative"),
        sa.CheckConstraint("selling_price >= 0", name="ck_batches_selling_price_nonnegative"),
        sa.CheckConstraint("expiry_date >= received_date", name="ck_batches_expiry_after_received"),
        sa.ForeignKeyConstraint(["medicine_id"], ["medicines.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_medicine_batches_code"),
    )
    op.create_index("ix_medicine_batches_medicine_id", "medicine_batches", ["medicine_id"])
    op.create_index("ix_medicine_batches_supplier_id", "medicine_batches", ["supplier_id"])
    op.create_index("ix_medicine_batches_expiry_date", "medicine_batches", ["expiry_date"])

    op.create_table(
        "invoices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="DRAFT", nullable=False),
        sa.Column("total_amount", sa.Numeric(14, 2), server_default="0", nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("status IN ('DRAFT', 'FINALIZED', 'CANCELLED')", name="ck_invoices_supported_status"),
        sa.CheckConstraint("total_amount >= 0", name="ck_invoices_total_nonnegative"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_invoices_code"),
    )
    op.create_index("ix_invoices_status", "invoices", ["status"])
    op.create_index("ix_invoices_created_at", "invoices", ["created_at"])

    op.create_table(
        "invoice_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("invoice_id", sa.Integer(), nullable=False),
        sa.Column("medicine_id", sa.Integer(), nullable=False),
        sa.Column("batch_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("line_total", sa.Numeric(14, 2), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_invoice_items_quantity_positive"),
        sa.CheckConstraint("unit_price >= 0", name="ck_invoice_items_unit_price_nonnegative"),
        sa.CheckConstraint("line_total >= 0", name="ck_invoice_items_line_total_nonnegative"),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["medicine_id"], ["medicines.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["batch_id"], ["medicine_batches.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_invoice_items_invoice_id", "invoice_items", ["invoice_id"])
    op.create_index("ix_invoice_items_batch_id", "invoice_items", ["batch_id"])


def downgrade() -> None:
    op.drop_index("ix_invoice_items_batch_id", table_name="invoice_items")
    op.drop_index("ix_invoice_items_invoice_id", table_name="invoice_items")
    op.drop_table("invoice_items")
    op.drop_index("ix_invoices_created_at", table_name="invoices")
    op.drop_index("ix_invoices_status", table_name="invoices")
    op.drop_table("invoices")
    op.drop_index("ix_medicine_batches_expiry_date", table_name="medicine_batches")
    op.drop_index("ix_medicine_batches_supplier_id", table_name="medicine_batches")
    op.drop_index("ix_medicine_batches_medicine_id", table_name="medicine_batches")
    op.drop_table("medicine_batches")
    op.drop_index("ix_suppliers_name", table_name="suppliers")
    op.drop_table("suppliers")
