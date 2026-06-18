"""short_selling

Revision ID: n3c4d5e6f7g8
Revises: m2b3c4d5e6f7
Create Date: 2026-06-18
"""
from alembic import op
import sqlalchemy as sa

revision = "n3c4d5e6f7g8"
down_revision = "m2b3c4d5e6f7"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("holdings", sa.Column("es_corto", sa.Boolean(), server_default="false", nullable=False))
    op.drop_constraint("uq_holding_alumno_grupo_ticker", "holdings", type_="unique")
    op.create_unique_constraint("uq_holding_alumno_grupo_ticker_tipo", "holdings", ["alumno_id", "grupo_id", "ticker", "es_corto"])


def downgrade():
    op.drop_constraint("uq_holding_alumno_grupo_ticker_tipo", "holdings", type_="unique")
    op.create_unique_constraint("uq_holding_alumno_grupo_ticker", "holdings", ["alumno_id", "grupo_id", "ticker"])
    op.drop_column("holdings", "es_corto")
