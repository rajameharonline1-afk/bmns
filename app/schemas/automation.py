from pydantic import BaseModel, Field


class DeviceSnapshotRequest(BaseModel):
    host: str
    snmp_community: str = Field(default="public")
    routeros_username: str = Field(default="admin")
    routeros_password: str = Field(default="")
    routeros_port: int = Field(default=8728)


class DeviceSnapshotTaskResponse(BaseModel):
    task_id: str
    status: str


class CeleryTaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: dict | str | None = None
