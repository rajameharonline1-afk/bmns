from datetime import datetime

from app.models.client_portal import ClientPortalPostType, ClientSupportTicketStatus
from app.schemas.base import APIModel


class ClientRef(APIModel):
    client_code: str
    customer_name: str
    username: str


class ClientPortalPostBase(APIModel):
    post_type: ClientPortalPostType
    title: str
    body: str
    image_path: str | None = None
    target_client_code: str | None = None
    published_at: datetime | None = None
    display_order: int = 0


class ClientPortalPostCreate(ClientPortalPostBase):
    pass


class ClientPortalPostUpdate(APIModel):
    post_type: ClientPortalPostType | None = None
    title: str | None = None
    body: str | None = None
    image_path: str | None = None
    target_client_code: str | None = None
    published_at: datetime | None = None
    display_order: int | None = None


class ClientPortalPostRead(ClientPortalPostBase):
    id: int


class ClientUsageStatBase(APIModel):
    uptime_seconds: int = 0
    downloaded_gb: int = 0
    uploaded_gb: int = 0


class ClientUsageStatUpsert(ClientUsageStatBase):
    client_code: str


class ClientUsageStatRead(ClientUsageStatBase):
    id: int
    client_code: str


class ClientSupportTicketBase(APIModel):
    client_code: str
    subject: str
    details: str | None = None
    status: ClientSupportTicketStatus = ClientSupportTicketStatus.processing


class ClientSupportTicketCreate(ClientSupportTicketBase):
    pass


class ClientSupportTicketUpdate(APIModel):
    subject: str | None = None
    details: str | None = None
    status: ClientSupportTicketStatus | None = None


class ClientSupportTicketRead(ClientSupportTicketBase):
    id: int
