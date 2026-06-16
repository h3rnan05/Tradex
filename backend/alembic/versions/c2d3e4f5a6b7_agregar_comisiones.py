"""agregar comisiones y costos de operacion

Revision ID: c2d3e4f5a6b7
Revises: b1f2c3d4e5a6
Create Date: 2026-06-16 08:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, None] = 'b1f2c3d4e5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'grupos',
        sa.Column('comision_porcentaje', sa.Numeric(precision=5, scale=4), nullable=False, server_default='0'),
    )
    op.add_column(
        'ordenes',
        sa.Column('comision', sa.Numeric(precision=14, scale=4), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    op.drop_column('ordenes', 'comision')
    op.drop_column('grupos', 'comision_porcentaje')
