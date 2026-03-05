from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ConfigurationItem(Base, TimestampMixin):
    __tablename__ = "configuration_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(180), index=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    zone_name: Mapped[str | None] = mapped_column(String(180), nullable=True)
    sub_zone_name: Mapped[str | None] = mapped_column(String(180), nullable=True)
    featured_image_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Package-oriented fields
    package_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    bandwidth_allocation_mb: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    vas: Mapped[str | None] = mapped_column(String(180), nullable=True)
    show_on_client_profile: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    linked_plan_id: Mapped[int | None] = mapped_column(ForeignKey("plans.id"), nullable=True, index=True)
