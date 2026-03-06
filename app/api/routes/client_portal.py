from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.deps import require_roles
from app.models.client import Client
from app.models.client_onboarding import ClientOnboarding
from app.models.client_portal import ClientPortalPost, ClientSupportTicket, ClientUsageStat
from app.models.user import User
from app.schemas.client_portal import (
    ClientPortalPostCreate,
    ClientPortalPostRead,
    ClientPortalPostUpdate,
    ClientRef,
    ClientSupportTicketCreate,
    ClientSupportTicketRead,
    ClientSupportTicketUpdate,
    ClientUsageStatRead,
    ClientUsageStatUpsert,
)

router = APIRouter()
UPLOAD_DIR = Path("uploads/client-portal")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _ensure_client_code(db: Session, client_code: str) -> None:
    exists = db.query(Client.id).filter(Client.client_code == client_code).first()
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client code not found")


@router.get("/clients", response_model=list[ClientRef])
def list_clients_for_portal(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> list[ClientRef]:
    rows = (
        db.query(Client, ClientOnboarding, User)
        .outerjoin(ClientOnboarding, ClientOnboarding.client_id == Client.id)
        .outerjoin(User, User.id == Client.user_id)
        .order_by(Client.client_code.asc())
        .all()
    )
    return [
        ClientRef(
            client_code=client.client_code,
            customer_name=(onboarding.customer_name if onboarding and onboarding.customer_name else user.username if user else client.client_code),
            username=user.username if user else "",
        )
        for client, onboarding, user in rows
    ]


@router.post("/upload-image")
def upload_post_image(
    file: UploadFile = File(...),
    _user=Depends(require_roles("admin", "manager")),
) -> dict:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only jpeg/png/webp images are allowed")
    suffix = Path(file.filename or "").suffix.lower() or ".png"
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        suffix = ".png"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"portal_{uuid4().hex}{suffix}"
    path = UPLOAD_DIR / filename
    content = file.file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    path.write_bytes(content)
    return {"file_path": f"/uploads/client-portal/{filename}"}


@router.get("/posts", response_model=list[ClientPortalPostRead])
def list_posts(
    post_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> list[ClientPortalPost]:
    query = db.query(ClientPortalPost)
    if post_type:
        query = query.filter(ClientPortalPost.post_type == post_type)
    return query.order_by(ClientPortalPost.display_order.asc(), ClientPortalPost.published_at.desc()).all()


@router.post("/posts", response_model=ClientPortalPostRead, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: ClientPortalPostCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> ClientPortalPost:
    if payload.target_client_code:
        _ensure_client_code(db, payload.target_client_code)
    row = ClientPortalPost(
        post_type=payload.post_type,
        title=payload.title.strip(),
        body=payload.body.strip(),
        image_path=payload.image_path,
        target_client_code=payload.target_client_code,
        published_at=payload.published_at or datetime.utcnow(),
        display_order=payload.display_order,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/posts/{post_id}", response_model=ClientPortalPostRead)
def update_post(
    post_id: int,
    payload: ClientPortalPostUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> ClientPortalPost:
    row = db.query(ClientPortalPost).filter(ClientPortalPost.id == post_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    data = payload.model_dump(exclude_unset=True)
    target_client_code = data.get("target_client_code")
    if target_client_code:
        _ensure_client_code(db, target_client_code)
    for field, value in data.items():
        setattr(row, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin")),
) -> None:
    row = db.query(ClientPortalPost).filter(ClientPortalPost.id == post_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    db.delete(row)
    db.commit()


@router.get("/usage", response_model=list[ClientUsageStatRead])
def list_usage(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> list[ClientUsageStat]:
    return db.query(ClientUsageStat).order_by(ClientUsageStat.client_code.asc()).all()


@router.put("/usage/{client_code}", response_model=ClientUsageStatRead)
def upsert_usage(
    client_code: str,
    payload: ClientUsageStatUpsert,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> ClientUsageStat:
    if payload.client_code != client_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Client code mismatch")
    _ensure_client_code(db, client_code)
    row = db.query(ClientUsageStat).filter(ClientUsageStat.client_code == client_code).first()
    if not row:
        row = ClientUsageStat(client_code=client_code)
        db.add(row)
        db.flush()
    row.uptime_seconds = payload.uptime_seconds
    row.downloaded_gb = payload.downloaded_gb
    row.uploaded_gb = payload.uploaded_gb
    db.commit()
    db.refresh(row)
    return row


@router.get("/tickets", response_model=list[ClientSupportTicketRead])
def list_tickets(
    client_code: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> list[ClientSupportTicket]:
    query = db.query(ClientSupportTicket)
    if client_code:
        query = query.filter(ClientSupportTicket.client_code == client_code)
    return query.order_by(ClientSupportTicket.created_at.desc()).all()


@router.post("/tickets", response_model=ClientSupportTicketRead, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: ClientSupportTicketCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee", "client")),
) -> ClientSupportTicket:
    _ensure_client_code(db, payload.client_code)
    row = ClientSupportTicket(
        client_code=payload.client_code,
        subject=payload.subject.strip(),
        details=(payload.details or "").strip() or None,
        status=payload.status,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/tickets/{ticket_id}", response_model=ClientSupportTicketRead)
def update_ticket(
    ticket_id: int,
    payload: ClientSupportTicketUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> ClientSupportTicket:
    row = db.query(ClientSupportTicket).filter(ClientSupportTicket.id == ticket_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(row, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/tickets/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> None:
    row = db.query(ClientSupportTicket).filter(ClientSupportTicket.id == ticket_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    db.delete(row)
    db.commit()
