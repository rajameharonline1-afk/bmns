from datetime import datetime

from pydantic import Field

from app.schemas.base import APIModel


class OltBase(APIModel):
    ip_address: str = Field(..., min_length=3)
    community: str | None = None
    username: str | None = None
    password: str | None = None
    snmp_port: int = Field(161, ge=1, le=65535)
    olt_type: str = Field(..., min_length=2)
    is_active: bool = True
    last_seen: datetime | None = None


class OltCreate(OltBase):
    pass


class OltUpdate(APIModel):
    ip_address: str | None = None
    community: str | None = None
    username: str | None = None
    password: str | None = None
    snmp_port: int | None = Field(default=None, ge=1, le=65535)
    olt_type: str | None = None
    is_active: bool | None = None
    last_seen: datetime | None = None


class OltRead(OltBase):
    id: int
