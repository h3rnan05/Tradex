"""maestro config evaluacion

Revision ID: h7c8d9e0f1a2
Revises: g6b7c8d9e0f1
Create Date: 2026-06-17

"""
from alembic import op
import sqlalchemy as sa

revision = "h7c8d9e0f1a2"
down_revision = "g6b7c8d9e0f1"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("memberships", sa.Column("pausado", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("memberships", sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.add_column("users", sa.Column("escuela", sa.String(), nullable=True))
    op.add_column("users", sa.Column("ciudad", sa.String(), nullable=True))
    op.add_column("users", sa.Column("estado", sa.String(), nullable=True))


def downgrade():
    op.drop_column("memberships", "pausado")
    op.drop_column("memberships", "created_at")
    op.drop_column("users", "escuela")
    op.drop_column("users", "ciudad")
    op.drop_column("users", "estado")
