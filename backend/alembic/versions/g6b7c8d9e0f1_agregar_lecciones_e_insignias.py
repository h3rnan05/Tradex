"""agregar insignias y comentarios

Revision ID: g6b7c8d9e0f1
Revises: f5a6b7c8d9e0
Create Date: 2026-06-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "g6b7c8d9e0f1"
down_revision = "f5a6b7c8d9e0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "insignias_alumno",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("alumno_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("grupo_id", UUID(as_uuid=True), sa.ForeignKey("grupos.id"), nullable=True),
        sa.Column("codigo", sa.String(50), nullable=False),
        sa.Column("otorgada_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("alumno_id", "codigo", "grupo_id", name="uq_insignia_alumno_codigo_grupo"),
    )
    op.create_table(
        "comentarios_orden",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("orden_id", UUID(as_uuid=True), sa.ForeignKey("ordenes.id"), nullable=False),
        sa.Column("maestro_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("grupo_id", UUID(as_uuid=True), sa.ForeignKey("grupos.id"), nullable=False),
        sa.Column("texto", sa.String(1000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("comentarios_orden")
    op.drop_table("insignias_alumno")
