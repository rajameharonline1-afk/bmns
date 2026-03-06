from app.schemas.base import APIModel


class KpiCardData(APIModel):
    title: str
    value: str
    subtitle: str


class FinanceMetric(APIModel):
    title: str
    value: str
    subtitle: str


class UnpaidClientData(APIModel):
    user: str
    mobile: str
    bill: str
    due: str


class TimeSeriesPoint(APIModel):
    month: str
    value: int


class PerformancePoint(APIModel):
    month: str
    active: int
    growth: int


class TicketSummary(APIModel):
    pending_tickets: int = 0
    processing_tickets: int = 0
    pending_tasks: int = 0
    processing_tasks: int = 0


class AdminDashboardSummary(APIModel):
    kpi_cards: list[KpiCardData]
    finance_cards: list[FinanceMetric]
    unpaid_clients: list[UnpaidClientData]
    monthly_new_clients: list[TimeSeriesPoint]
    performance: list[PerformancePoint]
    tickets: TicketSummary


class ClientDashboardTile(APIModel):
    title: str
    value: str
    subtitle: str
    footer_action: str
    tone: str


class ClientUsageSummary(APIModel):
    uptime_label: str
    downloaded_gb: str
    uploaded_gb: str


class ClientTicketSummary(APIModel):
    title: str
    status: str
    action_label: str


class ClientPostItem(APIModel):
    id: int
    title: str
    body: str
    image_path: str | None = None
    published_label: str


class ClientDashboardSummary(APIModel):
    login_code: str
    server_ip: str
    package_name: str
    package_speed_label: str
    tiles: list[ClientDashboardTile]
    usage: ClientUsageSummary
    ticket: ClientTicketSummary
    message: ClientPostItem | None = None
    news: list[ClientPostItem]
    notices: list[ClientPostItem]
