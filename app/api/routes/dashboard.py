from __future__ import annotations

from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.deps import require_roles
from app.models.client import Client, ConnectionStatus
from app.models.client_portal import (
    ClientPortalPost,
    ClientPortalPostType,
    ClientSupportTicket,
    ClientSupportTicketStatus,
    ClientUsageStat,
)
from app.models.configuration_item import ConfigurationItem
from app.models.invoice import Invoice, InvoiceStatus, Payment
from app.models.user import User
from app.schemas.dashboard import (
    AdminDashboardSummary,
    ClientDashboardSummary,
    ClientDashboardTile,
    ClientPostItem,
    ClientTicketSummary,
    ClientUsageSummary,
    FinanceMetric,
    KpiCardData,
    PerformancePoint,
    TicketSummary,
    TimeSeriesPoint,
    UnpaidClientData,
)

router = APIRouter()


def _to_int(value: int | None) -> int:
    return int(value or 0)


def _to_money(value: Decimal | float | int | None) -> str:
    amount = Decimal(value or 0)
    return f"{amount:.2f}"


def _uptime_label(seconds: int | None) -> str:
    total = max(int(seconds or 0), 0)
    days, rem = divmod(total, 86400)
    hours, rem = divmod(rem, 3600)
    minutes, sec = divmod(rem, 60)
    return f"{days}D {hours}H {minutes}M {sec}S"


@router.get("/admin-summary", response_model=AdminDashboardSummary)
def admin_summary(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> AdminDashboardSummary:
    today = date.today()
    this_year = today.year
    this_month = today.month

    total_clients = _to_int(db.query(func.count(Client.id)).scalar())
    running_clients = _to_int(
        db.query(func.count(Client.id)).filter(Client.connection_status == ConnectionStatus.active).scalar()
    )
    inactive_clients = _to_int(
        db.query(func.count(Client.id)).filter(Client.connection_status != ConnectionStatus.active).scalar()
    )

    new_clients = _to_int(
        db.query(func.count(Client.id))
        .filter(extract("year", Client.created_at) == this_year)
        .filter(extract("month", Client.created_at) == this_month)
        .scalar()
    )

    billing_clients = _to_int(db.query(func.count(func.distinct(Invoice.client_id))).scalar())
    paid_clients = _to_int(
        db.query(func.count(func.distinct(Invoice.client_id)))
        .filter(Invoice.status == InvoiceStatus.paid)
        .scalar()
    )
    unpaid_clients_count = _to_int(
        db.query(func.count(func.distinct(Invoice.client_id)))
        .filter(Invoice.status.in_([InvoiceStatus.issued, InvoiceStatus.overdue]))
        .scalar()
    )

    blocked_clients = _to_int(
        db.query(func.count(Client.id)).filter(Client.connection_status == ConnectionStatus.suspended).scalar()
    )

    expired_clients = _to_int(db.query(func.count(Client.id)).filter(Client.expiry_date < today).scalar())

    total_pop = _to_int(db.query(func.count(ConfigurationItem.id)).filter(ConfigurationItem.kind == "pop").scalar())
    total_pop_clients = _to_int(
        db.query(func.count(Client.id))
        .join(User, User.id == Client.user_id)
        .filter(User.is_active.is_(True))
        .scalar()
    )

    monthly_bill = db.query(func.coalesce(func.sum(Invoice.total_amount), 0)).filter(
        extract("year", Invoice.issue_date) == this_year,
        extract("month", Invoice.issue_date) == this_month,
    ).scalar()
    collected_bill = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        extract("year", Payment.paid_at) == this_year,
        extract("month", Payment.paid_at) == this_month,
    ).scalar()
    total_due = db.query(func.coalesce(func.sum(Invoice.total_amount), 0)).filter(
        Invoice.status.in_([InvoiceStatus.issued, InvoiceStatus.overdue, InvoiceStatus.draft])
    ).scalar()

    monthly_new_clients: list[TimeSeriesPoint] = []
    performance: list[PerformancePoint] = []
    previous_active = 0
    for month in range(1, 13):
        label = date(this_year, month, 1).strftime("%b")
        month_count = _to_int(
            db.query(func.count(Client.id))
            .filter(extract("year", Client.created_at) == this_year)
            .filter(extract("month", Client.created_at) == month)
            .scalar()
        )
        monthly_new_clients.append(TimeSeriesPoint(month=label, value=month_count))

        active_count = _to_int(
            db.query(func.count(Client.id))
            .filter(Client.connection_status == ConnectionStatus.active)
            .filter(extract("year", Client.created_at) <= this_year)
            .scalar()
        )
        growth = max(active_count - previous_active, 0) if previous_active else month_count
        performance.append(PerformancePoint(month=label, active=active_count, growth=growth))
        previous_active = active_count

    unpaid_rows = (
        db.query(
            Client.pppoe_username.label("username"),
            User.username.label("user_display"),
            User.email.label("email"),
            func.coalesce(func.sum(Invoice.total_amount), 0).label("due_total"),
        )
        .join(User, User.id == Client.user_id)
        .join(Invoice, Invoice.client_id == Client.id)
        .filter(Invoice.status.in_([InvoiceStatus.issued, InvoiceStatus.overdue, InvoiceStatus.draft]))
        .group_by(Client.id, Client.pppoe_username, User.username, User.email)
        .order_by(func.sum(Invoice.total_amount).desc())
        .limit(20)
        .all()
    )

    unpaid_clients = [
        UnpaidClientData(
            user=row.username or row.user_display or "N/A",
            mobile="N/A",
            bill="0.00",
            due=_to_money(row.due_total),
        )
        for row in unpaid_rows
    ]

    kpi_cards = [
        KpiCardData(title="Total Client", value=str(total_clients), subtitle="Number of all clients at present"),
        KpiCardData(title="Running Clients", value=str(running_clients), subtitle="Clients currently active"),
        KpiCardData(title="Inactive Clients", value=str(inactive_clients), subtitle="Clients currently inactive"),
        KpiCardData(title="New Client", value=str(new_clients), subtitle="Monthly number of new clients"),
        KpiCardData(title="Billing Clients", value=str(billing_clients), subtitle="Clients with generated bill"),
        KpiCardData(title="Paid Clients", value=str(paid_clients), subtitle="Clients fully paid"),
        KpiCardData(title="Unpaid Clients", value=str(unpaid_clients_count), subtitle="Clients fully unpaid"),
        KpiCardData(title="Online Clients", value=str(running_clients), subtitle="Clients currently connected"),
        KpiCardData(title="Blocked Clients", value=str(blocked_clients), subtitle="Clients disabled by rule"),
        KpiCardData(title="Bill Date Expire", value=str(expired_clients), subtitle="Billing date expired clients"),
        KpiCardData(title="Total Pop", value=str(total_pop), subtitle="Total number of POPs"),
        KpiCardData(title="Total Pop Clients", value=str(total_pop_clients), subtitle="Active clients across POPs"),
    ]

    finance_cards = [
        FinanceMetric(title="Monthly Bill", value=_to_money(monthly_bill), subtitle="Current month customer bill"),
        FinanceMetric(title="Collected Bill", value=_to_money(collected_bill), subtitle="Current month received amount"),
        FinanceMetric(title="Discount", value="0.00", subtitle="Current month discount amount"),
        FinanceMetric(title="Total Due", value=_to_money(total_due), subtitle="Total due bill of client"),
        FinanceMetric(title="Income", value=_to_money(collected_bill), subtitle="Current month income amount"),
        FinanceMetric(title="Expense", value="0.00", subtitle="Current month expense amount"),
    ]

    return AdminDashboardSummary(
        kpi_cards=kpi_cards,
        finance_cards=finance_cards,
        unpaid_clients=unpaid_clients,
        monthly_new_clients=monthly_new_clients,
        performance=performance,
        tickets=TicketSummary(),
    )


@router.get("/client-summary", response_model=ClientDashboardSummary)
def client_summary(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("client", "admin", "manager", "employee")),
) -> ClientDashboardSummary:
    client = db.query(Client).filter(Client.user_id == current_user.id).first()
    if client is None:
        client = db.query(Client).order_by(Client.id.asc()).first()
    if client is None:
        return ClientDashboardSummary(
            login_code="N/A",
            server_ip="N/A",
            package_name="No Package",
            package_speed_label="0 Mbps",
            tiles=[
                ClientDashboardTile(
                    title="Package",
                    value="No Package",
                    subtitle="0 Mbps",
                    footer_action="Migration/Update",
                    tone="purple",
                ),
                ClientDashboardTile(
                    title="Monthly Bill",
                    value="0.00",
                    subtitle="No billing data available.",
                    footer_action="My Profile",
                    tone="purple",
                ),
                ClientDashboardTile(
                    title="Paid(Advance)",
                    value="0.00",
                    subtitle="No advance available.",
                    footer_action="Recharge/Pay Bill",
                    tone="green",
                ),
                ClientDashboardTile(
                    title="Expiry Date",
                    value="N/A",
                    subtitle="No service expiry set.",
                    footer_action="Extend BillingDate",
                    tone="red",
                ),
                ClientDashboardTile(
                    title="Service Invoice",
                    value="Upcoming",
                    subtitle="No invoice data.",
                    footer_action="Migration/Update",
                    tone="purple",
                ),
                ClientDashboardTile(
                    title="Service Due",
                    value="0.00",
                    subtitle="No due amount.",
                    footer_action="Migration/Update",
                    tone="purple",
                ),
            ],
            usage=ClientUsageSummary(
                uptime_label=_uptime_label(0),
                downloaded_gb="0.0",
                uploaded_gb="0.0",
            ),
            ticket=ClientTicketSummary(title="Not Found", status="Processing", action_label="New Ticket"),
            message=None,
            news=[],
            notices=[],
        )

    total_invoice = db.query(func.coalesce(func.sum(Invoice.total_amount), 0)).filter(Invoice.client_id == client.id).scalar()
    total_paid = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .join(Invoice, Invoice.id == Payment.invoice_id)
        .filter(Invoice.client_id == client.id)
        .scalar()
    )
    due_total = (
        db.query(func.coalesce(func.sum(Invoice.total_amount), 0))
        .filter(Invoice.client_id == client.id)
        .filter(Invoice.status.in_([InvoiceStatus.issued, InvoiceStatus.overdue, InvoiceStatus.draft]))
        .scalar()
    )
    month_bill = (
        db.query(func.coalesce(func.sum(Invoice.total_amount), 0))
        .filter(Invoice.client_id == client.id)
        .filter(extract("year", Invoice.issue_date) == date.today().year)
        .filter(extract("month", Invoice.issue_date) == date.today().month)
        .scalar()
    )
    advance = max(Decimal(total_paid or 0) - Decimal(total_invoice or 0), Decimal(0))

    usage = db.query(ClientUsageStat).filter(ClientUsageStat.client_code == client.client_code).first()
    if usage is None:
        usage = ClientUsageStat(client_code=client.client_code, uptime_seconds=216345, downloaded_gb=43, uploaded_gb=13)
        db.add(usage)
        db.commit()
        db.refresh(usage)

    latest_ticket = (
        db.query(ClientSupportTicket)
        .filter(ClientSupportTicket.client_code == client.client_code)
        .order_by(ClientSupportTicket.created_at.desc())
        .first()
    )
    if latest_ticket is None:
        latest_ticket = ClientSupportTicket(
            client_code=client.client_code,
            subject="Initial setup support",
            details="Support request is in processing queue.",
            status=ClientSupportTicketStatus.processing,
        )
        db.add(latest_ticket)
        db.commit()
        db.refresh(latest_ticket)

    posts = (
        db.query(ClientPortalPost)
        .filter(
            (ClientPortalPost.target_client_code.is_(None)) | (ClientPortalPost.target_client_code == client.client_code)
        )
        .order_by(ClientPortalPost.display_order.asc(), ClientPortalPost.published_at.desc())
        .all()
    )
    if not posts:
        posts = [
            ClientPortalPost(
                post_type=ClientPortalPostType.message,
                title="Support Created",
                body=f"প্রিয় গ্রাহক, আপনার ক্লায়েন্ট কোড: {client.pppoe_username}। সাপোর্ট টিম শিগগিরই যোগাযোগ করবে।",
                display_order=0,
            ),
            ClientPortalPost(
                post_type=ClientPortalPostType.news,
                title="বকেয়া মাশ",
                body="অনলাইনে বিল পেমেন্ট করুন।",
                display_order=1,
            ),
            ClientPortalPost(
                post_type=ClientPortalPostType.news,
                title="FTP & Live TV Server",
                body="FTP & Live TV দেখতে ক্লিক করুন।",
                display_order=2,
            ),
            ClientPortalPost(
                post_type=ClientPortalPostType.notice,
                title="Scheduled maintenance notice",
                body="Tonight 2AM-3AM maintenance window.",
                display_order=1,
            ),
        ]
        db.add_all(posts)
        db.commit()

    def post_to_schema(post: ClientPortalPost) -> ClientPostItem:
        published = (post.published_at or date.today()).strftime("%B %d, %Y")
        return ClientPostItem(
            id=post.id,
            title=post.title,
            body=post.body,
            image_path=post.image_path,
            published_label=published,
        )

    message = next((post for post in posts if post.post_type == ClientPortalPostType.message), None)
    news = [post_to_schema(post) for post in posts if post.post_type == ClientPortalPostType.news][:6]
    notices = [post_to_schema(post) for post in posts if post.post_type == ClientPortalPostType.notice][:6]

    ticket_status = latest_ticket.status.value if latest_ticket.status else "processing"
    tiles = [
        ClientDashboardTile(
            title="Package",
            value=client.plan.name if client.plan else "Basic",
            subtitle=f"{client.plan.bandwidth_mbps if client.plan else 0}Mbps",
            footer_action="Migration/Update",
            tone="purple",
        ),
        ClientDashboardTile(
            title="Monthly Bill",
            value=_to_money(month_bill),
            subtitle="You have to pay this amount in every month.",
            footer_action="My Profile",
            tone="purple",
        ),
        ClientDashboardTile(
            title="Paid(Advance)",
            value=_to_money(advance),
            subtitle="You have advanced paid amount, no need to pay.",
            footer_action="Recharge/Pay Bill",
            tone="green",
        ),
        ClientDashboardTile(
            title="Expiry Date",
            value=client.expiry_date.strftime("%d-%b-%Y").upper() if client.expiry_date else "N/A",
            subtitle="This is your internet expiry date.",
            footer_action="Extend BillingDate",
            tone="red",
        ),
        ClientDashboardTile(
            title="Service Invoice",
            value="Upcoming" if due_total else "No Invoice",
            subtitle="Upcoming service invoices are shown here.",
            footer_action="Migration/Update",
            tone="purple",
        ),
        ClientDashboardTile(
            title="Service Due",
            value=_to_money(due_total),
            subtitle="Pending service due amount.",
            footer_action="Migration/Update",
            tone="purple",
        ),
    ]

    return ClientDashboardSummary(
        login_code=client.client_code,
        server_ip=client.ip_address,
        package_name=client.plan.name if client.plan else "Basic",
        package_speed_label=f"{client.plan.bandwidth_mbps if client.plan else 0}Mbps",
        tiles=tiles,
        usage=ClientUsageSummary(
            uptime_label=_uptime_label(usage.uptime_seconds),
            downloaded_gb=f"{usage.downloaded_gb:.1f}",
            uploaded_gb=f"{usage.uploaded_gb:.1f}",
        ),
        ticket=ClientTicketSummary(
            title=latest_ticket.subject if latest_ticket.subject else "Not Found",
            status=ticket_status.title(),
            action_label="New Ticket",
        ),
        message=post_to_schema(message) if message else None,
        news=news,
        notices=notices,
    )
