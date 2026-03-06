from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SAEnum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ClientPortalPostType(str, Enum):
    news = "news"
    notice = "notice"
    message = "message"


class ClientPortalPost(Base, TimestampMixin):
    __tablename__ = "client_portal_posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    post_type: Mapped[ClientPortalPostType] = mapped_column(SAEnum(ClientPortalPostType), index=True)
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text)
    image_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    target_client_code: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    display_order: Mapped[int] = mapped_column(Integer, default=0)


class ClientUsageStat(Base, TimestampMixin):
    __tablename__ = "client_usage_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_code: Mapped[str] = mapped_column(String(64), index=True, unique=True)
    uptime_seconds: Mapped[int] = mapped_column(Integer, default=0)
    downloaded_gb: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_gb: Mapped[int] = mapped_column(Integer, default=0)


class ClientSupportTicketStatus(str, Enum):
    processing = "processing"
    pending = "pending"
    solved = "solved"


class ClientSupportTicket(Base, TimestampMixin):
    __tablename__ = "client_support_tickets"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_code: Mapped[str] = mapped_column(String(64), index=True)
    subject: Mapped[str] = mapped_column(String(160))
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ClientSupportTicketStatus] = mapped_column(
        SAEnum(ClientSupportTicketStatus), default=ClientSupportTicketStatus.processing, index=True
    )
