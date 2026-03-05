from pydantic import Field

from app.schemas.base import APIModel


class MikrotikServerBase(APIModel):
    server_ip: str = Field(..., min_length=3)
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    api_port: int = Field(8728, ge=1, le=65535)
    mikrotik_version: str = Field("v3", min_length=2, max_length=32)
    request_timeout_sec: int = Field(10, ge=1, le=120)
    is_active: bool = True
    server_name: str | None = None


class MikrotikServerCreate(MikrotikServerBase):
    pass


class MikrotikServerUpdate(APIModel):
    server_ip: str | None = None
    username: str | None = None
    password: str | None = None
    api_port: int | None = Field(default=None, ge=1, le=65535)
    mikrotik_version: str | None = Field(default=None, min_length=2, max_length=32)
    request_timeout_sec: int | None = Field(default=None, ge=1, le=120)
    is_active: bool | None = None
    server_name: str | None = None


class MikrotikServerRead(MikrotikServerBase):
    id: int
