"""admin role and suspendido field

Revision ID: i8d9e0f1a2b3
Revises: h7c8d9e0f1a2
Create Date: 2026-06-17

"""
from alembic import op
import sqlalchemy as sa

revision = "i8d9e0f1a2b3"
down_revision = "h7c8d9e0f1a2"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE rolenum ADD VALUE IF NOT EXISTS 'admin'")
    op.add_column("users", sa.Column("suspendido", sa.Boolean(), nullable=False, server_default="false"))


def downgrade():
    op.drop_column("users", "suspendido")
