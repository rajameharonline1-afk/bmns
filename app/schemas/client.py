from datetime import date

from app.models.client import ConnectionStatus
from app.schemas.base import APIModel
from app.schemas.plan import PlanRead


class ClientBase(APIModel):
    client_code: str
    plan_id: int
    pppoe_username: str
    pppoe_password: str
    ip_address: str
    mac_address: str
    connection_status: ConnectionStatus = ConnectionStatus.active
    expiry_date: date | None = None


class ClientCreate(ClientBase):
    user_id: int


class ClientUpdate(APIModel):
    client_code: str | None = None
    plan_id: int | None = None
    pppoe_username: str | None = None
    pppoe_password: str | None = None
    ip_address: str | None = None
    mac_address: str | None = None
    connection_status: ConnectionStatus | None = None
    expiry_date: date | None = None


class ClientRead(ClientBase):
    id: int
    user_id: int
    plan: PlanRead
