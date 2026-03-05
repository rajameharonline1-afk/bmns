from datetime import date
from enum import Enum

from sqlalchemy import Date, Enum as SAEnum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ConnectionStatus(str, Enum):
    active = "active"
    suspended = "suspended"
    disconnected = "disconnected"


class Client(Base, TimestampMixin):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("plans.id"), index=True)
    pppoe_username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    pppoe_password: Mapped[str] = mapped_column(String(255))
    ip_address: Mapped[str] = mapped_column(String(45))
    mac_address: Mapped[str] = mapped_column(String(17))
    connection_status: Mapped[ConnectionStatus] = mapped_column(
        SAEnum(ConnectionStatus), default=ConnectionStatus.active
    )
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    user = relationship("User", back_populates="client_profile")
    plan = relationship("Plan", back_populates="clients")
    invoices = relationship("Invoice", back_populates="client")
