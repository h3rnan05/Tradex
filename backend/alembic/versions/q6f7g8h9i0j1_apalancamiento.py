"""apalancamiento (margin / leverage)

Adds a `prestamo` column to holdings and reto_holdings to track the financed
portion of leveraged positions (borrowed cash for longs, committed collateral
for shorts in the normal portfolio). Default 0 keeps every existing position at
1x leverage, so the change is fully backward compatible.

Revision ID: q6f7g8h9i0j1
Revises: p5e6f7g8h9i0
Create Date: 2026-06-22
"""
from alembic import op
from sqlalchemy import text

revision = "q6f7g8h9i0j1"
down_revision = "p5e6f7g8h9i0"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(text("""
        ALTER TABLE holdings
        ADD COLUMN IF NOT EXISTS prestamo NUMERIC(14, 2) NOT NULL DEFAULT 0
    """))
    conn.execute(text("""
        ALTER TABLE reto_holdings
        ADD COLUMN IF NOT EXISTS prestamo NUMERIC(14, 2) NOT NULL DEFAULT 0
    """))


def downgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE holdings DROP COLUMN IF EXISTS prestamo"))
    conn.execute(text("ALTER TABLE reto_holdings DROP COLUMN IF EXISTS prestamo"))
