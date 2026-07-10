"""Grupo: derivados_nivel; RetoParticipante: pausado

Revision ID: u0v1w2x3y4z5
Revises: t9u0v1w2x3y4
Create Date: 2026-06-24
"""

from alembic import op
import sqlalchemy as sa

revision = "u0v1w2x3y4z5"
down_revision = "t9u0v1w2x3y4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("grupos", sa.Column("derivados_nivel", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("reto_participantes", sa.Column("pausado", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("reto_participantes", "pausado")
    op.drop_column("grupos", "derivados_nivel")
