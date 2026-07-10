"""short_selling

Revision ID: n3c4d5e6f7g8
Revises: m2b3c4d5e6f7
Create Date: 2026-06-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "n3c4d5e6f7g8"
down_revision = "m2b3c4d5e6f7"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # Add es_corto column if it doesn't already exist
    conn.execute(text("""
        ALTER TABLE holdings
        ADD COLUMN IF NOT EXISTS es_corto BOOLEAN NOT NULL DEFAULT false
    """))

    # Drop any existing unique constraint on (alumno_id, grupo_id, ticker) by inspecting pg_constraint
    # This handles cases where the constraint name differs from what we expect
    conn.execute(text("""
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN
                SELECT conname
                FROM pg_constraint
                WHERE conrelid = 'holdings'::regclass
                  AND contype = 'u'
                  AND conname NOT LIKE '%ticker_tipo%'
                  AND conname NOT LIKE '%es_corto%'
                  AND (
                      conname ILIKE '%alumno%ticker%'
                      OR conname ILIKE '%holding%ticker%'
                      OR conname = 'uq_holding_alumno_grupo_ticker'
                  )
            LOOP
                EXECUTE 'ALTER TABLE holdings DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
            END LOOP;
        END $$;
    """))

    # Create the new unique constraint including es_corto only if it doesn't exist
    conn.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = 'holdings'::regclass
                  AND conname = 'uq_holding_alumno_grupo_ticker_tipo'
            ) THEN
                ALTER TABLE holdings
                ADD CONSTRAINT uq_holding_alumno_grupo_ticker_tipo
                UNIQUE (alumno_id, grupo_id, ticker, es_corto);
            END IF;
        END $$;
    """))


def downgrade():
    conn = op.get_bind()
    conn.execute(text("ALTER TABLE holdings DROP CONSTRAINT IF EXISTS uq_holding_alumno_grupo_ticker_tipo"))
    conn.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = 'holdings'::regclass
                  AND conname = 'uq_holding_alumno_grupo_ticker'
            ) THEN
                ALTER TABLE holdings
                ADD CONSTRAINT uq_holding_alumno_grupo_ticker
                UNIQUE (alumno_id, grupo_id, ticker);
            END IF;
        END $$;
    """))
    conn.execute(text("ALTER TABLE holdings DROP COLUMN IF EXISTS es_corto"))
