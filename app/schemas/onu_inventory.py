from pydantic import Field

from app.schemas.base import APIModel


class OnuInventoryBase(APIModel):
    onu_id: str = Field(..., min_length=1)
    client_code: str = Field(..., min_length=1)
    area: str | None = None
    sub_zone: str | None = None
    box: str | None = None
    description: str | None = None
    mac: str | None = None
    vlan: str | None = None
    status: str = Field("Online", min_length=1)
    distance_m: int | None = None
    signal_dbm: float | None = None
    lrt: str | None = None
    ldr: str | None = None
    olt_id: int


class OnuInventoryCreate(OnuInventoryBase):
    pass


class OnuInventoryUpdate(APIModel):
    onu_id: str | None = None
    client_code: str | None = None
    area: str | None = None
    sub_zone: str | None = None
    box: str | None = None
    description: str | None = None
    mac: str | None = None
    vlan: str | None = None
    status: str | None = None
    distance_m: int | None = None
    signal_dbm: float | None = None
    lrt: str | None = None
    ldr: str | None = None
    olt_id: int | None = None


class OnuInventoryRead(OnuInventoryBase):
    id: int
