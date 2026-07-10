"""retos tematicos con activos en vivo (escenario_id opcional)

Revision ID: p5e6f7g8h9i0
Revises: o4d5e6f7g8h9
Create Date: 2026-06-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "p5e6f7g8h9i0"
down_revision: Union[str, None] = "o4d5e6f7g8h9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Lista de tickers permitidos para retos en vivo (separados por coma).
    op.add_column("retos", sa.Column("activos_permitidos", sa.String(), nullable=True))
    # escenario_id deja de ser obligatorio: los retos en vivo no usan escenario.
    op.alter_column("retos", "escenario_id", existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    op.alter_column("retos", "escenario_id", existing_type=sa.String(), nullable=False)
    op.drop_column("retos", "activos_permitidos")
