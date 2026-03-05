from enum import Enum

from sqlalchemy import Boolean, Enum as SAEnum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class DeviceType(str, Enum):
    mikrotik = "mikrotik"
    olt = "olt"
    other = "other"


class NetworkDevice(Base, TimestampMixin):
    __tablename__ = "network_devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    device_type: Mapped[DeviceType] = mapped_column(SAEnum(DeviceType))
    ip_address: Mapped[str] = mapped_column(String(45), unique=True)
    api_username: Mapped[str] = mapped_column(String(120))
    api_password: Mapped[str] = mapped_column(String(255))
    snmp_community: Mapped[str | None] = mapped_column(String(120), nullable=True)
    api_port: Mapped[int] = mapped_column(default=8728)
    mikrotik_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    request_timeout_sec: Mapped[int] = mapped_column(default=10)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
