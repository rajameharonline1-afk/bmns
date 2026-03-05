from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.deps import require_roles
from app.core.snmp import snmp_ping
from app.models.olt import Olt
from app.schemas.olt import OltCreate, OltRead, OltUpdate

router = APIRouter()


def get_olt(db: Session, olt_id: int) -> Olt:
    olt = db.query(Olt).filter(Olt.id == olt_id).first()
    if not olt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OLT not found")
    return olt


def split_host_port(ip_address: str, default_port: int) -> tuple[str, int]:
    if ":" in ip_address:
        host, port_str = ip_address.rsplit(":", 1)
        if host and port_str.isdigit():
            return host, int(port_str)
    return ip_address, default_port


@router.post("/", response_model=OltRead, status_code=status.HTTP_201_CREATED)
def create_olt(
    payload: OltCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> Olt:
    host, port = split_host_port(payload.ip_address, payload.snmp_port)
    existing = db.query(Olt).filter(Olt.ip_address == host).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OLT IP already exists")
    olt = Olt(
        ip_address=host,
        community=payload.community,
        username=payload.username,
        password=payload.password,
        snmp_port=port,
        olt_type=payload.olt_type,
        is_active=payload.is_active,
    )
    db.add(olt)
    db.commit()
    db.refresh(olt)
    return olt


@router.get("/", response_model=list[OltRead])
def list_olts(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> list[Olt]:
    return db.query(Olt).order_by(Olt.id).all()


@router.put("/{olt_id}", response_model=OltRead)
def update_olt(
    olt_id: int,
    payload: OltUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> Olt:
    olt = get_olt(db, olt_id)
    data = payload.model_dump(exclude_unset=True)
    if "ip_address" in data:
        new_ip_raw = data["ip_address"]
        host, port = split_host_port(new_ip_raw, data.get("snmp_port", olt.snmp_port))
        existing = db.query(Olt).filter(Olt.ip_address == host, Olt.id != olt.id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OLT IP already exists")
        data["ip_address"] = host
        data["snmp_port"] = port
    for field, value in data.items():
        setattr(olt, field, value)
    db.commit()
    db.refresh(olt)
    return olt


@router.patch("/{olt_id}/toggle", response_model=OltRead)
def toggle_olt(
    olt_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> Olt:
    olt = get_olt(db, olt_id)
    olt.is_active = not olt.is_active
    db.commit()
    db.refresh(olt)
    return olt


@router.post("/sync")
def sync_olts(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> dict:
    results: list[dict] = []
    errors: list[dict] = []
    for olt in db.query(Olt).order_by(Olt.id).all():
        ok, error = snmp_ping(olt.ip_address, olt.snmp_port, olt.community)
        if ok:
            olt.is_active = True
            olt.last_seen = datetime.utcnow()
            results.append({"id": olt.id, "ip_address": olt.ip_address, "status": "ok"})
        else:
            olt.is_active = False
            errors.append({"id": olt.id, "ip_address": olt.ip_address, "error": error or "SNMP failed"})
    db.commit()
    return {"status": "ok", "results": results, "errors": errors}


@router.delete("/{olt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_olt(
    olt_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin")),
) -> None:
    olt = get_olt(db, olt_id)
    db.delete(olt)
    db.commit()
