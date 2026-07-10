"""Agregar estado fallida a ordenes_pendientes e índices en FKs calientes

Revision ID: l1a2b3c4d5e6
Revises: k0f1a2b3c4d5
Create Date: 2026-06-18

"""
from alembic import op
import sqlalchemy as sa

revision = "l1a2b3c4d5e6"
down_revision = "k0f1a2b3c4d5"
branch_labels = None
depends_on = None


def upgrade():
    # Add 'fallida' to the enum (PostgreSQL requires ALTER TYPE)
    op.execute("ALTER TYPE estadoordenenum ADD VALUE IF NOT EXISTS 'fallida'")

    # Indexes on hot FK columns
    op.create_index("ix_holdings_alumno_id", "holdings", ["alumno_id"], if_not_exists=True)
    op.create_index("ix_holdings_grupo_id", "holdings", ["grupo_id"], if_not_exists=True)
    op.create_index("ix_memberships_alumno_id", "memberships", ["alumno_id"], if_not_exists=True)
    op.create_index("ix_memberships_grupo_id", "memberships", ["grupo_id"], if_not_exists=True)
    op.create_index("ix_ordenes_pendientes_alumno_estado", "ordenes_pendientes", ["alumno_id", "estado"], if_not_exists=True)
    op.create_index("ix_alertas_alumno_activa", "alertas", ["alumno_id", "activa"], if_not_exists=True)
    op.create_index("ix_ordenes_alumno_grupo", "ordenes", ["alumno_id", "grupo_id"], if_not_exists=True)


def downgrade():
    op.drop_index("ix_ordenes_alumno_grupo", table_name="ordenes")
    op.drop_index("ix_alertas_alumno_activa", table_name="alertas")
    op.drop_index("ix_ordenes_pendientes_alumno_estado", table_name="ordenes_pendientes")
    op.drop_index("ix_memberships_grupo_id", table_name="memberships")
    op.drop_index("ix_memberships_alumno_id", table_name="memberships")
    op.drop_index("ix_holdings_grupo_id", table_name="holdings")
    op.drop_index("ix_holdings_alumno_id", table_name="holdings")
