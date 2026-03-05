"""add configuration items

Revision ID: b3f9b420c6e1
Revises: 8f2b2c4a7c3d
Create Date: 2026-03-02
"""

from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b3f9b420c6e1"
down_revision: Union[str, None] = "8f2b2c4a7c3d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "configuration_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("zone_name", sa.String(length=180), nullable=True),
        sa.Column("sub_zone_name", sa.String(length=180), nullable=True),
        sa.Column("featured_image_path", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("package_type", sa.String(length=64), nullable=True),
        sa.Column("bandwidth_allocation_mb", sa.Integer(), nullable=True),
        sa.Column("price", sa.Numeric(10, 2), nullable=True),
        sa.Column("vas", sa.String(length=180), nullable=True),
        sa.Column("show_on_client_profile", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("linked_plan_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["linked_plan_id"], ["plans.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_configuration_items_kind"), "configuration_items", ["kind"], unique=False)
    op.create_index(op.f("ix_configuration_items_name"), "configuration_items", ["name"], unique=False)
    op.create_index(op.f("ix_configuration_items_linked_plan_id"), "configuration_items", ["linked_plan_id"], unique=False)

    config_table = sa.table(
        "configuration_items",
        sa.column("kind", sa.String),
        sa.column("name", sa.String),
        sa.column("details", sa.Text),
        sa.column("zone_name", sa.String),
        sa.column("sub_zone_name", sa.String),
        sa.column("is_active", sa.Boolean),
        sa.column("show_on_client_profile", sa.Boolean),
        sa.column("created_at", sa.DateTime),
        sa.column("updated_at", sa.DateTime),
    )
    now = datetime.utcnow()
    op.bulk_insert(
        config_table,
        [
            {"kind": "zone", "name": "Rajamehar", "details": None, "zone_name": None, "sub_zone_name": None, "is_active": True, "show_on_client_profile": True, "created_at": now, "updated_at": now},
            {"kind": "zone", "name": "Moricha", "details": None, "zone_name": None, "sub_zone_name": None, "is_active": True, "show_on_client_profile": True, "created_at": now, "updated_at": now},
            {"kind": "sub-zone", "name": "Uttar para", "details": None, "zone_name": "Rajamehar", "sub_zone_name": None, "is_active": True, "show_on_client_profile": True, "created_at": now, "updated_at": now},
            {"kind": "sub-zone", "name": "Gobindupur", "details": None, "zone_name": "Rajamehar", "sub_zone_name": None, "is_active": True, "show_on_client_profile": True, "created_at": now, "updated_at": now},
            {"kind": "box", "name": "Bhuyan Bari", "details": None, "zone_name": "Rajamehar", "sub_zone_name": "Gobindupur", "is_active": True, "show_on_client_profile": True, "created_at": now, "updated_at": now},
            {"kind": "connection-type", "name": "Wireless", "details": None, "zone_name": None, "sub_zone_name": None, "is_active": False, "show_on_client_profile": True, "created_at": now, "updated_at": now},
            {"kind": "connection-type", "name": "Optical Fiber", "details": None, "zone_name": None, "sub_zone_name": None, "is_active": True, "show_on_client_profile": True, "created_at": now, "updated_at": now},
            {"kind": "protocol-type", "name": "Static", "details": None, "zone_name": None, "sub_zone_name": None, "is_active": False, "show_on_client_profile": True, "created_at": now, "updated_at": now},
            {"kind": "protocol-type", "name": "PPPOE", "details": None, "zone_name": None, "sub_zone_name": None, "is_active": True, "show_on_client_profile": True, "created_at": now, "updated_at": now},
            {"kind": "billing-status", "name": "Active", "details": None, "zone_name": None, "sub_zone_name": None, "is_active": True, "show_on_client_profile": True, "created_at": now, "updated_at": now},
            {"kind": "billing-status", "name": "Inactive", "details": None, "zone_name": None, "sub_zone_name": None, "is_active": False, "show_on_client_profile": True, "created_at": now, "updated_at": now},
            {"kind": "district", "name": "Comilla", "details": None, "zone_name": None, "sub_zone_name": None, "is_active": True, "show_on_client_profile": True, "created_at": now, "updated_at": now},
            {"kind": "upazila", "name": "Debidwar", "details": None, "zone_name": None, "sub_zone_name": None, "is_active": True, "show_on_client_profile": True, "created_at": now, "updated_at": now},
            {"kind": "client-type", "name": "Home", "details": "Different Type Of Home like: Variatiya, Sthaniyo etc.", "zone_name": None, "sub_zone_name": None, "is_active": True, "show_on_client_profile": True, "created_at": now, "updated_at": now},
            {"kind": "client-type", "name": "Corporate", "details": "Different Type Of Office like: Bank, Group, Dealership etc.", "zone_name": None, "sub_zone_name": None, "is_active": True, "show_on_client_profile": True, "created_at": now, "updated_at": now},
        ],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_configuration_items_linked_plan_id"), table_name="configuration_items")
    op.drop_index(op.f("ix_configuration_items_name"), table_name="configuration_items")
    op.drop_index(op.f("ix_configuration_items_kind"), table_name="configuration_items")
    op.drop_table("configuration_items")
