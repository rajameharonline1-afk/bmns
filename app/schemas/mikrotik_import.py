from datetime import date

from pydantic import Field

from app.schemas.base import APIModel


class ImportRouterOption(APIModel):
    id: int
    name: str
    ip: str


class ImportOptionsResponse(APIModel):
    routers: list[ImportRouterOption]
    profiles: list[str]


class ImportPreviewRequest(APIModel):
    router_id: int
    profile: str | None = None
    invoice_month: date | None = None
    import_client_name: bool = True
    import_mobile: bool = True
    import_status: bool = True
    import_package_and_bill: bool = True
    import_pppoe_passwords: bool = True


class ImportPreviewRow(APIModel):
    pppoe_id: str
    password: str | None = None
    comment: str | None = None
    client: str | None = None
    mobile: str | None = None
    profile: str | None = None
    package: str | None = None
    price: int | None = None
    status: str | None = None


class ImportPreviewResponse(APIModel):
    router: ImportRouterOption
    invoice_month: date | None = None
    rows: list[ImportPreviewRow]
    package_missing: bool = False
    warnings: list[str] = Field(default_factory=list)


class ImportRowUpdateRequest(APIModel):
    router_id: int
    pppoe_id: str
    client: str | None = None
    mobile: str | None = None
    profile: str | None = None
    package: str | None = None
    status: str | None = None
    password: str | None = None


class ImportCommitRequest(APIModel):
    router_id: int
    invoice_month: date | None = None
    selected_rows: list[ImportPreviewRow]


class ImportCommitResponse(APIModel):
    imported: int
    updated_clients: int
    created_clients: int
    updated_router_secrets: int
