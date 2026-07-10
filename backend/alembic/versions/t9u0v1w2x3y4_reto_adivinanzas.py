"""Reto: tabla reto_adivinanzas para el juego de adivinanza por fases

Revision ID: t9u0v1w2x3y4
Revises: s8i9j0k1l2m3
Create Date: 2026-06-23
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "t9u0v1w2x3y4"
down_revision = "s8i9j0k1l2m3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reto_adivinanzas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("reto_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("retos.id"), nullable=False),
        sa.Column("alumno_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("decada_guess", sa.String(), nullable=True),
        sa.Column("pais_guess", sa.String(), nullable=True),
        sa.Column("causa_guess", sa.String(), nullable=True),
        sa.Column("puntos", sa.Numeric(5, 0), nullable=True),
        sa.Column("aplicado", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("reto_id", "alumno_id", name="uq_reto_adivinanza_alumno"),
    )


def downgrade() -> None:
    op.drop_table("reto_adivinanzas")
