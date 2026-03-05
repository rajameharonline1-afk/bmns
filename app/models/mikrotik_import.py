from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MikrotikImportRecord(Base):
    __tablename__ = "mikrotik_import_records"
    __table_args__ = (UniqueConstraint("server_id", "pppoe_id", name="uq_mikrotik_import_server_pppoe"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    server_id: Mapped[int] = mapped_column(ForeignKey("network_devices.id"), index=True)
    invoice_month: Mapped[date | None] = mapped_column(Date, nullable=True)
    pppoe_id: Mapped[str] = mapped_column(String(128), index=True)
    password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mobile: Mapped[str | None] = mapped_column(String(32), nullable=True)
    profile: Mapped[str | None] = mapped_column(String(128), nullable=True)
    package: Mapped[str | None] = mapped_column(String(128), nullable=True)
    price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    imported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
