"""agregar fases de activacion progresiva de activos

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-06-16 08:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, None] = 'c2d3e4f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'fases_activo',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('grupo_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('grupos.id'), nullable=False),
        sa.Column('tipo_activo', sa.String(), nullable=False),
        sa.Column('fecha_activacion', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('grupo_id', 'tipo_activo', name='uq_grupo_tipo_activo'),
    )


def downgrade() -> None:
    op.drop_table('fases_activo')
