"""email_verification

Revision ID: o4d5e6f7g8h9
Revises: n3c4d5e6f7g8
Create Date: 2026-06-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "o4d5e6f7g8h9"
down_revision = "n3c4d5e6f7g8"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # Add email_verificado column to users (idempotent)
    conn.execute(text("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT false
    """))

    # Create email_verification_tokens table (idempotent)
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS email_verification_tokens (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash VARCHAR NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            used BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ
        )
    """))
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_email_verification_tokens_user_id
        ON email_verification_tokens (user_id)
    """))
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_email_verification_tokens_token_hash
        ON email_verification_tokens (token_hash)
    """))


def downgrade():
    conn = op.get_bind()
    conn.execute(text("DROP TABLE IF EXISTS email_verification_tokens"))
    conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS email_verificado"))
