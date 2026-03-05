from datetime import date, datetime
from decimal import Decimal

from app.models.invoice import InvoiceStatus, PaymentMethod
from app.schemas.base import APIModel


class InvoiceItemBase(APIModel):
    plan_id: int | None = None
    description: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemRead(InvoiceItemBase):
    id: int


class InvoiceBase(APIModel):
    client_id: int
    issue_date: date
    due_date: date
    status: InvoiceStatus = InvoiceStatus.draft
    total_amount: Decimal
    currency: str = "USD"
    notes: str | None = None


class InvoiceCreate(InvoiceBase):
    items: list[InvoiceItemCreate]


class InvoiceRead(InvoiceBase):
    id: int
    items: list[InvoiceItemRead] = []


class PaymentBase(APIModel):
    amount: Decimal
    paid_at: datetime
    method: PaymentMethod
    reference: str | None = None


class PaymentCreate(PaymentBase):
    invoice_id: int


class PaymentRead(PaymentBase):
    id: int
    invoice_id: int
