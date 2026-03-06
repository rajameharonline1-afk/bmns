"""enforce client code across portals

Revision ID: e1a8e4f7cd21
Revises: c12a9c30f8d2
Create Date: 2026-03-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e1a8e4f7cd21"
down_revision: Union[str, None] = "c12a9c30f8d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    def column_exists(table: str, column: str) -> bool:
        return any(col["name"] == column for col in inspector.get_columns(table))

    def index_exists(table: str, index_name: str) -> bool:
        return any(index["name"] == index_name for index in inspector.get_indexes(table))

    if not column_exists("clients", "client_code"):
        op.add_column("clients", sa.Column("client_code", sa.String(length=64), nullable=True))
    op.execute("UPDATE clients SET client_code = CONCAT('C', LPAD(id, 5, '0')) WHERE client_code IS NULL")
    op.alter_column("clients", "client_code", existing_type=sa.String(length=64), nullable=False)
    if not index_exists("clients", op.f("ix_clients_client_code")):
        op.create_index(op.f("ix_clients_client_code"), "clients", ["client_code"], unique=True)

    if not column_exists("client_portal_posts", "target_client_code"):
        op.add_column("client_portal_posts", sa.Column("target_client_code", sa.String(length=64), nullable=True))
    if not index_exists("client_portal_posts", op.f("ix_client_portal_posts_target_client_code")):
        op.create_index(op.f("ix_client_portal_posts_target_client_code"), "client_portal_posts", ["target_client_code"], unique=False)
    if column_exists("client_portal_posts", "target_client_id"):
        op.execute(
            """
            UPDATE client_portal_posts p
            JOIN clients c ON p.target_client_id = c.id
            SET p.target_client_code = c.client_code
            WHERE p.target_client_id IS NOT NULL
            """
        )

    if not column_exists("client_usage_stats", "client_code"):
        op.add_column("client_usage_stats", sa.Column("client_code", sa.String(length=64), nullable=True))
    if column_exists("client_usage_stats", "client_id"):
        op.execute(
            """
            UPDATE client_usage_stats s
            JOIN clients c ON s.client_id = c.id
            SET s.client_code = c.client_code
            """
        )
    op.execute("UPDATE client_usage_stats SET client_code = CONCAT('CLEGACY', id) WHERE client_code IS NULL")
    op.alter_column("client_usage_stats", "client_code", existing_type=sa.String(length=64), nullable=False)
    if not index_exists("client_usage_stats", op.f("ix_client_usage_stats_client_code")):
        op.create_index(op.f("ix_client_usage_stats_client_code"), "client_usage_stats", ["client_code"], unique=True)

    if not column_exists("client_support_tickets", "client_code"):
        op.add_column("client_support_tickets", sa.Column("client_code", sa.String(length=64), nullable=True))
    if column_exists("client_support_tickets", "client_id"):
        op.execute(
            """
            UPDATE client_support_tickets t
            JOIN clients c ON t.client_id = c.id
            SET t.client_code = c.client_code
            """
        )
    op.execute("UPDATE client_support_tickets SET client_code = CONCAT('CLEGACY', id) WHERE client_code IS NULL")
    op.alter_column("client_support_tickets", "client_code", existing_type=sa.String(length=64), nullable=False)
    if not index_exists("client_support_tickets", op.f("ix_client_support_tickets_client_code")):
        op.create_index(op.f("ix_client_support_tickets_client_code"), "client_support_tickets", ["client_code"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_client_support_tickets_client_code"), table_name="client_support_tickets")
    op.drop_column("client_support_tickets", "client_code")

    op.drop_index(op.f("ix_client_usage_stats_client_code"), table_name="client_usage_stats")
    op.drop_column("client_usage_stats", "client_code")

    op.drop_index(op.f("ix_client_portal_posts_target_client_code"), table_name="client_portal_posts")
    op.drop_column("client_portal_posts", "target_client_code")

    op.drop_index(op.f("ix_clients_client_code"), table_name="clients")
    op.drop_column("clients", "client_code")
