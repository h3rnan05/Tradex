"""agregar controles de maestro a grupos

Revision ID: b1f2c3d4e5a6
Revises: a704f2b0cc99
Create Date: 2026-06-16 07:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b1f2c3d4e5a6'
down_revision: Union[str, None] = 'a704f2b0cc99'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('grupos', sa.Column('max_alumnos', sa.Integer(), nullable=True))
    op.add_column(
        'grupos',
        sa.Column(
            'activos_permitidos',
            postgresql.ARRAY(sa.String()),
            nullable=False,
            server_default=sa.text("'{acciones}'"),
        ),
    )
    op.add_column('grupos', sa.Column('limite_orden_valor', sa.Numeric(precision=14, scale=2), nullable=True))


def downgrade() -> None:
    op.drop_column('grupos', 'limite_orden_valor')
    op.drop_column('grupos', 'activos_permitidos')
    op.drop_column('grupos', 'max_alumnos')
