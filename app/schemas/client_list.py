from datetime import date
from decimal import Decimal

from app.schemas.base import APIModel


class ClientListStat(APIModel):
    running_clients: int
    new_clients: int
    renewed_clients: int
    waiver_clients: int


class ClientListOptions(APIModel):
    servers: list[str]
    protocol_types: list[str]
    profiles: list[str]
    zones: list[str]
    sub_zones: list[str]
    boxes: list[str]
    packages: list[str]
    client_types: list[str]
    connection_types: list[str]
    billing_statuses: list[str]
    monitoring_statuses: list[str]
    custom_statuses: list[str]


class ClientListItem(APIModel):
    client_id: int
    c_code: str
    id_or_ip: str
    password: str
    customer_name: str
    mobile: str | None = None
    zone: str | None = None
    connection_type: str | None = None
    client_type: str | None = None
    package_speed: str | None = None
    monthly_bill: Decimal | None = None
    mac_address: str | None = None
    server: str | None = None
    billing_status: str | None = None
    monitoring_status: bool


class ClientListResponse(APIModel):
    stats: ClientListStat
    options: ClientListOptions
    items: list[ClientListItem]


class MonitorStatusUpdate(APIModel):
    enabled: bool


class MonitorStatusRead(APIModel):
    client_id: int
    monitoring_status: bool


class ClientListQuery(APIModel):
    server: str | None = None
    protocol_type: str | None = None
    profile: str | None = None
    zone: str | None = None
    sub_zone: str | None = None
    box: str | None = None
    package: str | None = None
    client_type: str | None = None
    connection_type: str | None = None
    b_status: str | None = None
    m_status: str | None = None
    custom_status: str | None = None
    from_date: date | None = None
    to_date: date | None = None
    search: str | None = None
