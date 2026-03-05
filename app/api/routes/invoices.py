from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.deps import require_roles
from app.models.invoice import Invoice, InvoiceItem
from app.schemas.invoice import InvoiceCreate, InvoiceRead

router = APIRouter()


def get_invoice(db: Session, invoice_id: int) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return invoice


def calculate_total(items: list[InvoiceItem]) -> Decimal:
    return sum((item.line_total for item in items), Decimal("0.00"))


@router.post("/", response_model=InvoiceRead, status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> Invoice:
    items = [InvoiceItem(**item.model_dump()) for item in payload.items]
    total_amount = calculate_total(items)
    invoice = Invoice(
        client_id=payload.client_id,
        issue_date=payload.issue_date,
        due_date=payload.due_date,
        status=payload.status,
        total_amount=total_amount,
        currency=payload.currency,
        notes=payload.notes,
        items=items,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


@router.get("/", response_model=list[InvoiceRead])
def list_invoices(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> list[Invoice]:
    return db.query(Invoice).order_by(Invoice.id).all()


@router.get("/{invoice_id}", response_model=InvoiceRead)
def read_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> Invoice:
    return get_invoice(db, invoice_id)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin")),
) -> None:
    invoice = get_invoice(db, invoice_id)
    db.delete(invoice)
    db.commit()
