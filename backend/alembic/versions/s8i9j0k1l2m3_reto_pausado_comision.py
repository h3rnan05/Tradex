"""Reto: pausado + grupo comision_base

Adds pausado boolean to retos table (default false).
Adds comision_base integer to grupos table (default 1, meaning 1%).

Revision ID: s8i9j0k1l2m3
Revises: r7h8i9j0k1l2
Create Date: 2026-06-23
"""

from alembic import op
import sqlalchemy as sa

revision = "s8i9j0k1l2m3"
down_revision = "r7h8i9j0k1l2"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("retos", sa.Column("pausado", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("grupos", sa.Column("comision_base", sa.Integer(), nullable=False, server_default="1"))


def downgrade():
    op.drop_column("retos", "pausado")
    op.drop_column("grupos", "comision_base")
