"""add_onu_inventory

Revision ID: 8f2b2c4a7c3d
Revises: 2d6f3b91c5c1
Create Date: 2026-02-26 21:05:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "8f2b2c4a7c3d"
down_revision: Union[str, None] = "2d6f3b91c5c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "onu_inventory",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("onu_id", sa.String(length=64), nullable=False),
        sa.Column("client_code", sa.String(length=64), nullable=False),
        sa.Column("area", sa.String(length=120), nullable=True),
        sa.Column("sub_zone", sa.String(length=120), nullable=True),
        sa.Column("box", sa.String(length=120), nullable=True),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("mac", sa.String(length=32), nullable=False),
        sa.Column("vlan", sa.String(length=16), nullable=True),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("distance_m", sa.Integer(), nullable=True),
        sa.Column("signal_dbm", sa.Float(), nullable=True),
        sa.Column("ldr", sa.String(length=64), nullable=True),
        sa.Column("olt_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["olt_id"], ["olts.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_onu_inventory_onu_id"), "onu_inventory", ["onu_id"], unique=False)
    op.create_index(op.f("ix_onu_inventory_client_code"), "onu_inventory", ["client_code"], unique=False)
    op.create_index(op.f("ix_onu_inventory_mac"), "onu_inventory", ["mac"], unique=False)
    op.create_index(op.f("ix_onu_inventory_olt_id"), "onu_inventory", ["olt_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_onu_inventory_olt_id"), table_name="onu_inventory")
    op.drop_index(op.f("ix_onu_inventory_mac"), table_name="onu_inventory")
    op.drop_index(op.f("ix_onu_inventory_client_code"), table_name="onu_inventory")
    op.drop_index(op.f("ix_onu_inventory_onu_id"), table_name="onu_inventory")
    op.drop_table("onu_inventory")
