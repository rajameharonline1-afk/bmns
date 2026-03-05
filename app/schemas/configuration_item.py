from decimal import Decimal

from app.schemas.base import APIModel


class ConfigurationItemCreate(APIModel):
    name: str
    details: str | None = None
    zone_name: str | None = None
    sub_zone_name: str | None = None
    featured_image_path: str | None = None
    is_active: bool = True
    package_type: str | None = None
    bandwidth_allocation_mb: int | None = None
    price: Decimal | None = None
    vas: str | None = None
    show_on_client_profile: bool = True


class ConfigurationItemUpdate(APIModel):
    name: str | None = None
    details: str | None = None
    zone_name: str | None = None
    sub_zone_name: str | None = None
    featured_image_path: str | None = None
    is_active: bool | None = None
    package_type: str | None = None
    bandwidth_allocation_mb: int | None = None
    price: Decimal | None = None
    vas: str | None = None
    show_on_client_profile: bool | None = None


class ConfigurationItemRead(APIModel):
    id: int
    kind: str
    name: str
    details: str | None = None
    zone_name: str | None = None
    sub_zone_name: str | None = None
    featured_image_path: str | None = None
    is_active: bool
    package_type: str | None = None
    bandwidth_allocation_mb: int | None = None
    price: Decimal | None = None
    vas: str | None = None
    show_on_client_profile: bool
    linked_plan_id: int | None = None


class ConfigurationItemListRead(APIModel):
    total: int
    page: int
    page_size: int
    items: list[ConfigurationItemRead]


class ConfigurationItemUploadRead(APIModel):
    file_path: str
