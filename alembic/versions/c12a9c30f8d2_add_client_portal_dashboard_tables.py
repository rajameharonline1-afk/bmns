"""add client portal dashboard tables

Revision ID: c12a9c30f8d2
Revises: b3f9b420c6e1
Create Date: 2026-03-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c12a9c30f8d2"
down_revision: Union[str, None] = "b3f9b420c6e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "client_portal_posts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("post_type", sa.Enum("news", "notice", "message", name="clientportalposttype"), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("image_path", sa.String(length=255), nullable=True),
        sa.Column("target_client_id", sa.Integer(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["target_client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_client_portal_posts_post_type"), "client_portal_posts", ["post_type"], unique=False)
    op.create_index(op.f("ix_client_portal_posts_target_client_id"), "client_portal_posts", ["target_client_id"], unique=False)

    op.create_table(
        "client_support_tickets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("subject", sa.String(length=160), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("status", sa.Enum("processing", "pending", "solved", name="clientsupportticketstatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_client_support_tickets_client_id"), "client_support_tickets", ["client_id"], unique=False)
    op.create_index(op.f("ix_client_support_tickets_status"), "client_support_tickets", ["status"], unique=False)

    op.create_table(
        "client_usage_stats",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("uptime_seconds", sa.Integer(), nullable=False),
        sa.Column("downloaded_gb", sa.Integer(), nullable=False),
        sa.Column("uploaded_gb", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_client_usage_stats_client_id"), "client_usage_stats", ["client_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_client_usage_stats_client_id"), table_name="client_usage_stats")
    op.drop_table("client_usage_stats")

    op.drop_index(op.f("ix_client_support_tickets_status"), table_name="client_support_tickets")
    op.drop_index(op.f("ix_client_support_tickets_client_id"), table_name="client_support_tickets")
    op.drop_table("client_support_tickets")

    op.drop_index(op.f("ix_client_portal_posts_target_client_id"), table_name="client_portal_posts")
    op.drop_index(op.f("ix_client_portal_posts_post_type"), table_name="client_portal_posts")
    op.drop_table("client_portal_posts")
