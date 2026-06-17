"""sponsor role

Revision ID: j9e0f1a2b3c4
Revises: i8d9e0f1a2b3
Create Date: 2026-06-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "j9e0f1a2b3c4"
down_revision = "i8d9e0f1a2b3"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE rolenum ADD VALUE IF NOT EXISTS 'sponsor'")
    op.add_column("grupos", sa.Column("sponsor_id", postgresql.UUID(as_uuid=True), nullable=True))


def downgrade():
    op.drop_column("grupos", "sponsor_id")
