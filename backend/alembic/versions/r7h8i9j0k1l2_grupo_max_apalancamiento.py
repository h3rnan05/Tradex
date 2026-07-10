"""Grupo: max_apalancamiento + ordenes_pendientes stop-loss / take-profit

Adds max_apalancamiento to grupos (default 5, capped at runtime by backend).
Adds sl_tp_tipo and precio_trigger to ordenes_pendientes for conditional orders.

Revision ID: r7h8i9j0k1l2
Revises: q6f7g8h9i0j1
Create Date: 2026-06-22
"""

from alembic import op
import sqlalchemy as sa

revision = "r7h8i9j0k1l2"
down_revision = "q6f7g8h9i0j1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("grupos", sa.Column("max_apalancamiento", sa.Integer(), nullable=False, server_default="5"))
    op.add_column(
        "ordenes_pendientes",
        sa.Column("sl_tp_tipo", sa.String(), nullable=True),  # "stop_loss" | "take_profit" | None
    )
    op.add_column(
        "ordenes_pendientes",
        sa.Column("precio_trigger", sa.Numeric(14, 4), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("ordenes_pendientes", "precio_trigger")
    op.drop_column("ordenes_pendientes", "sl_tp_tipo")
    op.drop_column("grupos", "max_apalancamiento")
