from __future__ import annotations

from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.deps import require_roles
from app.models.client import Client, ConnectionStatus
from app.models.configuration_item import ConfigurationItem
from app.models.invoice import Invoice, InvoiceStatus, Payment
from app.models.user import User
from app.schemas.dashboard import (
    AdminDashboardSummary,
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
