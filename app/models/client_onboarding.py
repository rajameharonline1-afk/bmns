from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ClientOnboarding(Base):
    __tablename__ = "client_onboarding"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True)
    package_id: Mapped[int | None] = mapped_column(ForeignKey("plans.id"), nullable=True, index=True)

    customer_name: Mapped[str] = mapped_column(String(255), index=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(120), nullable=True)
    nid_or_certificate_no: Mapped[str | None] = mapped_column(String(120), nullable=True)
    registration_perm_no: Mapped[str | None] = mapped_column(String(120), nullable=True)
    father_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    mother_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    profile_picture_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nid_picture_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    registration_picture_path: Mapped[str | None] = mapped_column(String(255), nullable=True)

    map_latitude: Mapped[str | None] = mapped_column(String(64), nullable=True)
    map_longitude: Mapped[str | None] = mapped_column(String(64), nullable=True)
    mobile_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    upazila: Mapped[str | None] = mapped_column(String(100), nullable=True)
    road_no: Mapped[str | None] = mapped_column(String(64), nullable=True)
    house_no: Mapped[str | None] = mapped_column(String(64), nullable=True)
    village_no: Mapped[str | None] = mapped_column(String(64), nullable=True)
    present_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    permanent_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    same_as_present_address: Mapped[bool] = mapped_column(Boolean, default=False)
    email_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    facebook_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    twitter_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    serial: Mapped[str | None] = mapped_column(String(64), nullable=True)
    protocol_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    zone: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sub_zone: Mapped[str | None] = mapped_column(String(100), nullable=True)
    box: Mapped[str | None] = mapped_column(String(100), nullable=True)
    connection_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    cable_required_meter: Mapped[str | None] = mapped_column(String(64), nullable=True)
    fiber_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    number_of_core: Mapped[str | None] = mapped_column(String(64), nullable=True)
    core_color: Mapped[str | None] = mapped_column(String(64), nullable=True)
    device: Mapped[str | None] = mapped_column(String(120), nullable=True)
    device_serial_no: Mapped[str | None] = mapped_column(String(120), nullable=True)
    vendor: Mapped[str | None] = mapped_column(String(120), nullable=True)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    profile: Mapped[str | None] = mapped_column(String(120), nullable=True)
    client_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    billing_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    owner_name_relation_in_billing: Mapped[str | None] = mapped_column(String(120), nullable=True)
    monthly_bill: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    billing_starting_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    expire_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    reference_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    vat_percent_client: Mapped[str | None] = mapped_column(String(32), nullable=True)
    connection_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    affiliate: Mapped[str | None] = mapped_column(String(120), nullable=True)
    send_greetings_sms: Mapped[bool] = mapped_column(Boolean, default=False)
    monitoring_status: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
