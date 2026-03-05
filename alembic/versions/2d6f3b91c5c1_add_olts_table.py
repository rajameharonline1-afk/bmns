"""add_olts_table

Revision ID: 2d6f3b91c5c1
Revises: 19ac6e8baefb
Create Date: 2026-02-26 19:45:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "2d6f3b91c5c1"
down_revision: Union[str, None] = "19ac6e8baefb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "olts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ip_address", sa.String(length=64), nullable=False),
        sa.Column("community", sa.String(length=120), nullable=True),
        sa.Column("username", sa.String(length=120), nullable=True),
        sa.Column("password", sa.String(length=255), nullable=True),
        sa.Column("snmp_port", sa.Integer(), nullable=False),
        sa.Column("olt_type", sa.String(length=120), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ip_address"),
    )


def downgrade() -> None:
    op.drop_table("olts")
