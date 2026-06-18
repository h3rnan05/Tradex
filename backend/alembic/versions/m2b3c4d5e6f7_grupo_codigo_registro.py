"""grupo_codigo_registro

Revision ID: m2b3c4d5e6f7
Revises: l1a2b3c4d5e6
Create Date: 2026-06-18

"""
from alembic import op
import sqlalchemy as sa

revision = "m2b3c4d5e6f7"
down_revision = "l1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("grupos", sa.Column("codigo", sa.String(6), nullable=True))
    op.create_unique_constraint("uq_grupos_codigo", "grupos", ["codigo"])
    op.create_index("ix_grupos_codigo", "grupos", ["codigo"])

    # Generate codes for existing groups
    op.execute("""
        UPDATE grupos
        SET codigo = upper(substring(md5(id::text) from 1 for 6))
        WHERE codigo IS NULL
    """)


def downgrade():
    op.drop_index("ix_grupos_codigo", table_name="grupos")
    op.drop_constraint("uq_grupos_codigo", "grupos", type_="unique")
    op.drop_column("grupos", "codigo")
