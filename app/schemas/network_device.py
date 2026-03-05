from app.models.network_device import DeviceType
from app.schemas.base import APIModel


class NetworkDeviceBase(APIModel):
    name: str
    device_type: DeviceType
    ip_address: str
    api_username: str
    api_password: str
    snmp_community: str | None = None
    api_port: int = 8728
    mikrotik_version: str | None = None
    request_timeout_sec: int = 10
    is_active: bool = True


class NetworkDeviceCreate(NetworkDeviceBase):
    pass


class NetworkDeviceUpdate(APIModel):
    name: str | None = None
    device_type: DeviceType | None = None
    ip_address: str | None = None
    api_username: str | None = None
    api_password: str | None = None
    snmp_community: str | None = None
    api_port: int | None = None
    mikrotik_version: str | None = None
    request_timeout_sec: int | None = None
    is_active: bool | None = None


class NetworkDeviceRead(NetworkDeviceBase):
    id: int
