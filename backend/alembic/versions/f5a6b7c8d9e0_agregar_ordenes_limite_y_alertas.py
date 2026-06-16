"""agregar ordenes limite y alertas

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-06-16

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "f5a6b7c8d9e0"
down_revision = "e4f5a6b7c8d9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ordenes_pendientes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("alumno_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("grupo_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("grupos.id"), nullable=False),
        sa.Column("ticker", sa.String(), nullable=False),
        sa.Column("tipo", sa.String(), nullable=False),
        sa.Column("cantidad", sa.Numeric(14, 4), nullable=False),
        sa.Column("precio_limite", sa.Numeric(14, 4), nullable=False),
        sa.Column(
            "estado",
            sa.Enum("pendiente", "ejecutada", "cancelada", name="estadoordenenum"),
            nullable=False,
            server_default="pendiente",
        ),
        sa.Column("creada_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ejecutada_en", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "alertas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("alumno_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("ticker", sa.String(), nullable=False),
        sa.Column("precio_objetivo", sa.Numeric(14, 4), nullable=False),
        sa.Column("condicion", sa.String(), nullable=False),
        sa.Column("activa", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("disparada", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("creada_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("disparada_en", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("alertas")
    op.drop_table("ordenes_pendientes")
    op.execute("DROP TYPE IF EXISTS estadoordenenum")
