from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class OnuInventory(Base, TimestampMixin):
    __tablename__ = "onu_inventory"

    id: Mapped[int] = mapped_column(primary_key=True)
    onu_id: Mapped[str] = mapped_column(String(64), index=True)
    client_code: Mapped[str] = mapped_column(String(64), index=True)
    area: Mapped[str | None] = mapped_column(String(120), nullable=True)
    sub_zone: Mapped[str | None] = mapped_column(String(120), nullable=True)
    box: Mapped[str | None] = mapped_column(String(120), nullable=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mac: Mapped[str] = mapped_column(String(32), index=True)
    vlan: Mapped[str | None] = mapped_column(String(16), nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="Online")
    distance_m: Mapped[int | None] = mapped_column(Integer, nullable=True)
    signal_dbm: Mapped[float | None] = mapped_column(Float, nullable=True)
    lrt: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ldr: Mapped[str | None] = mapped_column(String(64), nullable=True)

    olt_id: Mapped[int] = mapped_column(ForeignKey("olts.id"), index=True)
    olt = relationship("Olt")
