"""agregar retos cronometrados con escenarios historicos

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-06-16 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e4f5a6b7c8d9'
down_revision: Union[str, None] = 'd3e4f5a6b7c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'retos',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('grupo_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('grupos.id'), nullable=False),
        sa.Column('escenario_id', sa.String(), nullable=False),
        sa.Column('nombre', sa.String(), nullable=False),
        sa.Column('fecha_inicio', sa.DateTime(timezone=True), nullable=False),
        sa.Column('fecha_fin', sa.DateTime(timezone=True), nullable=False),
        sa.Column('capital_inicial', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        'reto_participantes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('reto_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('retos.id'), nullable=False),
        sa.Column('alumno_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('capital_disponible', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.UniqueConstraint('reto_id', 'alumno_id', name='uq_reto_alumno'),
    )

    op.create_table(
        'reto_holdings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('reto_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('retos.id'), nullable=False),
        sa.Column('alumno_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('ticker', sa.String(), nullable=False),
        sa.Column('cantidad', sa.Numeric(precision=14, scale=4), nullable=False),
        sa.Column('precio_promedio', sa.Numeric(precision=14, scale=4), nullable=False),
        sa.UniqueConstraint('reto_id', 'alumno_id', 'ticker', name='uq_reto_holding_alumno_ticker'),
    )

    op.create_table(
        'reto_ordenes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('reto_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('retos.id'), nullable=False),
        sa.Column('alumno_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('ticker', sa.String(), nullable=False),
        sa.Column('tipo', sa.Enum('compra', 'venta', name='tipoordenretoenum'), nullable=False),
        sa.Column('cantidad', sa.Numeric(precision=14, scale=4), nullable=False),
        sa.Column('precio_ejecucion', sa.Numeric(precision=14, scale=4), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('reto_ordenes')
    op.drop_table('reto_holdings')
    op.drop_table('reto_participantes')
    op.drop_table('retos')
    op.execute('DROP TYPE IF EXISTS tipoordenretoenum')
