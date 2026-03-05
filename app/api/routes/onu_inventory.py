import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.deps import require_roles
from app.core.snmp import snmp_bulk_walk
from app.core.telnet_olt import (
    collect_onu_snapshot_via_telnet,
    update_onu_description_via_telnet,
)
from app.models.olt import Olt
from app.models.onu_inventory import OnuInventory
from app.schemas.onu_inventory import OnuInventoryCreate, OnuInventoryRead, OnuInventoryUpdate

router = APIRouter()
SNMP_TIMEOUT = 2.0
SNMP_RETRIES = 2


class OnuConfigurePayload(BaseModel):
    description: str = Field(..., min_length=1, max_length=32)


def get_onu(db: Session, onu_id: int) -> OnuInventory:
    onu = db.query(OnuInventory).filter(OnuInventory.id == onu_id).first()
    if not onu:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ONU not found")
    return onu


@router.post("/", response_model=OnuInventoryRead, status_code=status.HTTP_201_CREATED)
def create_onu(
    payload: OnuInventoryCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> OnuInventory:
    olt = db.query(Olt).filter(Olt.id == payload.olt_id).first()
    if not olt:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OLT not found")
    onu = OnuInventory(**payload.model_dump())
    db.add(onu)
    db.commit()
    db.refresh(onu)
    return onu


@router.get("/", response_model=list[OnuInventoryRead])
def list_onu(
    status: str | None = None,
    min_dbm: float | None = None,
    max_dbm: float | None = None,
    olt_id: int | None = None,
    olt_ip: str | None = None,
    vlan: str | None = None,
    pon: int | None = None,
    onu: int | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> list[OnuInventory]:
    query = db.query(OnuInventory)
    if status:
        query = query.filter(OnuInventory.status.ilike(status))
    if min_dbm is not None:
        query = query.filter(OnuInventory.signal_dbm >= min_dbm)
    if max_dbm is not None:
        query = query.filter(OnuInventory.signal_dbm <= max_dbm)
    if olt_id is not None:
        query = query.filter(OnuInventory.olt_id == olt_id)
    if olt_ip:
        query = query.join(Olt).filter(Olt.ip_address == olt_ip)
    if vlan:
        query = query.filter(OnuInventory.vlan == vlan)
    if search:
        term = f"%{search}%"
        query = query.filter(
            OnuInventory.client_code.ilike(term)
            | OnuInventory.onu_id.ilike(term)
            | OnuInventory.mac.ilike(term)
        )
    rows = query.order_by(OnuInventory.id).all()
    deduped: dict[tuple[int, str] | str, OnuInventory] = {}
    for row in rows:
        key: tuple[int, str] | str
        if olt_id is not None or olt_ip:
            key = (row.olt_id, row.onu_id)
        else:
            key = row.onu_id

        current = deduped.get(key)
        if current is None:
            deduped[key] = row
            continue

        current_score = (
            int(current.distance_m is not None)
            + int(current.signal_dbm is not None)
            + int(bool(current.ldr and current.ldr != "N/A"))
            + int(bool(current.vlan))
        )
        row_score = (
            int(row.distance_m is not None)
            + int(row.signal_dbm is not None)
            + int(bool(row.ldr and row.ldr != "N/A"))
            + int(bool(row.vlan))
        )
        if row_score > current_score or (row_score == current_score and row.id > current.id):
            deduped[key] = row
    rows = sorted(deduped.values(), key=lambda item: item.id)
    if pon is None and onu is None:
        return rows

    def parse_pon_onu(onu_id: str) -> tuple[int | None, int | None]:
        try:
            if ":" not in onu_id or "/" not in onu_id:
                return None, None
            pon_part = onu_id.split("/")[-1]
            pon_str, onu_str = pon_part.split(":", 1)
            return int(pon_str), int(onu_str)
        except Exception:
            return None, None

    filtered: list[OnuInventory] = []
    for row in rows:
        pon_val, onu_val = parse_pon_onu(row.onu_id)
        if pon is not None and pon_val != pon:
            continue
        if onu is not None and onu_val != onu:
            continue
        filtered.append(row)
    return filtered


@router.get("/summary")
def onu_summary(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> dict:
    online = db.query(func.count(OnuInventory.id)).filter(OnuInventory.status.ilike("online")).scalar() or 0
    offline = db.query(func.count(OnuInventory.id)).filter(OnuInventory.status.ilike("offline")).scalar() or 0
    weak = (
        db.query(func.count(OnuInventory.id))
        .filter(OnuInventory.signal_dbm.isnot(None))
        .filter(OnuInventory.signal_dbm <= -24)
        .scalar()
        or 0
    )
    total_olt = db.query(func.count(Olt.id)).scalar() or 0
    return {"online": online, "offline": offline, "weak": weak, "total_olt": total_olt}


@router.post("/sync")
def sync_onu_inventory(
    olt_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> dict:
    # OID profiles for VSOL. Some devices expose ONU tables under 1.1.6.*,
    # others under 1.1.5.12.2.1.* with per-model differences.
    oid_profiles = [
        {
            "name": "vsol_1_1_6",
            "onu_id": "1.3.6.1.4.1.37950.1.1.6.1.1.2.1.5",
            "status": "1.3.6.1.4.1.37950.1.1.6.1.1.1.1.5",
            "distance": "1.3.6.1.4.1.37950.1.1.6.1.1.12.1.3",
            "rx_power": "1.3.6.1.4.1.37950.1.1.6.1.1.3.1.7",
        },
        {
            "name": "vsol_1_1_5_fallback",
            "table_root": "1.3.6.1.4.1.37950.1.1.5.12.2.1.14.1",
            "mac_root": "1.3.6.1.4.1.37950.1.1.5.12.2.1.2.1.5",
            "ldr_root": "1.3.6.1.4.1.37950.1.1.5.12.2.1.3.1.3",
        },
    ]

    def normalize_status(value: str) -> str:
        if value.lower() in {"1", "online", "up", "active"}:
            return "Online"
        if value.lower() in {"0", "offline", "down"}:
            return "Offline"
        return value

    def extract_index(base_oid: str, oid: str) -> tuple[int | None, int | None]:
        if not oid.startswith(base_oid + "."):
            return None, None
        tail = oid[len(base_oid) + 1 :]
        parts = [p for p in tail.split(".") if p.isdigit()]
        if len(parts) >= 2:
            return int(parts[-2]), int(parts[-1])
        return None, None

    def make_onu_id(pon: int | None, onu: int | None, fallback: str) -> str:
        if pon is not None and onu is not None:
            return f"EPON0/{pon}:{onu}"
        return fallback

    def normalize_status_code(value: str | None) -> str:
        if value is None:
            return "Online"
        if value == "1":
            return "Online"
        if value == "2":
            return "Offline"
        return normalize_status(value)

    def parse_onu_id_value(value: str) -> tuple[str, int | None, int | None]:
        cleaned = value.strip()
        match = re.search(r"EPON0/(\d+):(\d+)", cleaned, re.IGNORECASE)
        if not match:
            return cleaned, None, None
        pon = int(match.group(1))
        onu = int(match.group(2))
        return f"EPON0/{pon}:{onu}", pon, onu

    def parse_pon_from_onu_id(value: str) -> int | None:
        match = re.search(r"EPON0/(\d+):\d+", value, re.IGNORECASE)
        if not match:
            return None
        return int(match.group(1))

    def is_date_like(value: str) -> bool:
        text = value.strip()
        if not text:
            return False
        return bool(
            re.search(r"[A-Za-z]{3}\s+\d{1,2}\s+\d{4}\s+\d{2}:\d{2}:\d{2}", text)
            or re.search(r"\d{4}\s+\d{2}\s+\d{2}\s+\d{2}:\d{2}:\d{2}", text)
        )

    olts = db.query(Olt)
    if olt_id is not None:
        olts = olts.filter(Olt.id == olt_id)
    olts = olts.all()

    if not olts:
        return {"status": "ok", "updated": 0, "errors": ["No OLTs found"]}

    updated = 0
    errors: list[str] = []

    for olt in olts:
        try:
            profile_used = None
            id_rows: list[tuple[str, str]] = []
            status_rows: list[tuple[str, str]] = []
            dist_rows: list[tuple[str, str]] = []
            rx_rows: list[tuple[str, str]] = []
            for profile in oid_profiles:
                if profile["name"] == "vsol_1_1_5_fallback":
                    candidate_rows = snmp_bulk_walk(
                        olt.ip_address,
                        olt.snmp_port,
                        olt.community,
                        profile["table_root"],
                        max_rows=5000,
                        timeout=SNMP_TIMEOUT,
                        retries=SNMP_RETRIES,
                    )
                else:
                    candidate_rows = snmp_bulk_walk(
                        olt.ip_address,
                        olt.snmp_port,
                        olt.community,
                        profile["onu_id"],
                        max_rows=5000,
                        timeout=SNMP_TIMEOUT,
                        retries=SNMP_RETRIES,
                    )
                if not candidate_rows:
                    continue
                profile_used = profile
                if profile["name"] == "vsol_1_1_5_fallback":
                    table_rows = candidate_rows
                    by_col: dict[str, dict[str, str]] = {"1": {}, "2": {}, "3": {}, "4": {}}
                    table_root = profile["table_root"]
                    for oid, value in table_rows:
                        if not oid.startswith(table_root + "."):
                            continue
                        suffix = oid[len(table_root) + 1 :]
                        parts = suffix.split(".")
                        if len(parts) < 2:
                            continue
                        col, idx = parts[0], parts[1]
                        if col in by_col:
                            by_col[col][idx] = value

                    mac_rows = snmp_bulk_walk(
                        olt.ip_address,
                        olt.snmp_port,
                        olt.community,
                        profile["mac_root"],
                        max_rows=5000,
                        timeout=SNMP_TIMEOUT,
                        retries=SNMP_RETRIES,
                    )
                    mac_by_onu_id: dict[str, str] = {}
                    for oid, value in mac_rows:
                        parts = [p for p in oid.split(".") if p.isdigit()]
                        if len(parts) < 2:
                            continue
                        pon = parts[-2]
                        onu = parts[-1]
                        mac_by_onu_id[f"EPON0/{pon}:{onu}"] = value

                    ldr_rows = snmp_bulk_walk(
                        olt.ip_address,
                        olt.snmp_port,
                        olt.community,
                        profile["ldr_root"],
                        max_rows=5000,
                        timeout=SNMP_TIMEOUT,
                        retries=SNMP_RETRIES,
                    )
                    ldr_by_onu_id: dict[str, str] = {}
                    for oid, value in ldr_rows:
                        if not is_date_like(value):
                            continue
                        parts = [p for p in oid.split(".") if p.isdigit()]
                        if len(parts) < 2:
                            continue
                        pon = parts[-2]
                        onu = parts[-1]
                        ldr_by_onu_id[f"EPON0/{pon}:{onu}"] = value.strip()

                    for idx, raw_onu in by_col["2"].items():
                        onu_id, _pon, _onu = parse_onu_id_value(raw_onu)
                        if not onu_id:
                            continue
                        status_val = normalize_status_code(by_col["4"].get(idx))
                        signal_dbm = None
                        mac_value = mac_by_onu_id.get(onu_id, "00:00:00:00:00:00")
                        ldr_value = ldr_by_onu_id.get(onu_id)

                        existing = (
                            db.query(OnuInventory)
                            .filter(OnuInventory.olt_id == olt.id, OnuInventory.onu_id == onu_id)
                            .first()
                        )
                        if existing:
                            existing.status = status_val
                            if ldr_value:
                                existing.ldr = ldr_value
                            if mac_value:
                                existing.mac = mac_value
                        else:
                            db.add(
                                OnuInventory(
                                    onu_id=onu_id,
                                    client_code=onu_id,
                                    area=None,
                                    sub_zone=None,
                                    box=None,
                                    description=None,
                                    mac=mac_value,
                                    vlan=None,
                                    status=status_val,
                                    distance_m=None,
                                    signal_dbm=signal_dbm,
                                    lrt=None,
                                    ldr=ldr_value,
                                    olt_id=olt.id,
                                )
                            )
                        updated += 1
                    break
                else:
                    id_rows = candidate_rows
                    if profile["status"]:
                        status_rows = snmp_bulk_walk(
                            olt.ip_address,
                            olt.snmp_port,
                            olt.community,
                            profile["status"],
                            max_rows=5000,
                            timeout=SNMP_TIMEOUT,
                            retries=SNMP_RETRIES,
                        )
                    if profile["distance"]:
                        dist_rows = snmp_bulk_walk(
                            olt.ip_address,
                            olt.snmp_port,
                            olt.community,
                            profile["distance"],
                            max_rows=5000,
                            timeout=SNMP_TIMEOUT,
                            retries=SNMP_RETRIES,
                        )
                    if profile["rx_power"]:
                        rx_rows = snmp_bulk_walk(
                            olt.ip_address,
                            olt.snmp_port,
                            olt.community,
                            profile["rx_power"],
                            max_rows=5000,
                            timeout=SNMP_TIMEOUT,
                            retries=SNMP_RETRIES,
                        )
                break
        except Exception as exc:
            errors.append(f"{olt.ip_address}: {exc}")
            continue

        if not id_rows:
            if not (profile_used and profile_used["name"] == "vsol_1_1_5_fallback"):
                errors.append(f"{olt.ip_address}: no ONU rows returned from configured OID profiles")
                continue

        if id_rows:
            assert profile_used is not None
            oid_onu_id = profile_used["onu_id"]
            oid_status = profile_used["status"]
            oid_distance = profile_used["distance"]
            oid_rx_power = profile_used["rx_power"]

            status_map = {oid: normalize_status(val) for oid, val in status_rows}
            dist_map = {oid: val for oid, val in dist_rows}
            rx_map = {oid: val for oid, val in rx_rows}

            seen_onu_ids: set[str] = set()
            for oid, raw_id in id_rows:
                pon, onu = extract_index(oid_onu_id, oid)
                onu_id = make_onu_id(pon, onu, str(raw_id))
                if onu_id in seen_onu_ids:
                    continue
                seen_onu_ids.add(onu_id)
                suffix = oid[len(oid_onu_id) :]
                status_oid = (oid_status + suffix) if oid_status else None
                dist_oid = (oid_distance + suffix) if oid_distance else None
                rx_oid = (oid_rx_power + suffix) if oid_rx_power else None

                status_val = status_map.get(status_oid, "Online") if status_oid else "Online"
                dist_val = dist_map.get(dist_oid) if dist_oid else None
                _ = rx_map.get(rx_oid) if rx_oid else None

                distance_m = int(dist_val) if dist_val and dist_val.isdigit() else None
                signal_dbm = None
                mac_value = str(raw_id) if str(raw_id).strip() else "00:00:00:00:00:00"

                existing = (
                    db.query(OnuInventory)
                    .filter(OnuInventory.olt_id == olt.id, OnuInventory.onu_id == onu_id)
                    .first()
                )
                if existing:
                    existing.status = status_val
                    if distance_m is not None:
                        existing.distance_m = distance_m
                    existing.mac = mac_value
                else:
                    db.add(
                        OnuInventory(
                            onu_id=onu_id,
                            client_code=onu_id,
                            area=None,
                            sub_zone=None,
                            box=None,
                            description=None,
                            mac=mac_value,
                            vlan=None,
                            status=status_val,
                            distance_m=distance_m,
                            signal_dbm=signal_dbm,
                            lrt=None,
                            ldr=None,
                            olt_id=olt.id,
                        )
                    )
                updated += 1

        # Telnet snapshot: collect metrics + live fields in one session to reduce timeout/reset issues.
        telnet_metrics, telnet_live_fields, telnet_error = collect_onu_snapshot_via_telnet(olt)
        if telnet_error:
            errors.append(f"{olt.ip_address}: {telnet_error}")

        if telnet_metrics:
            olt_rows = db.query(OnuInventory).filter(OnuInventory.olt_id == olt.id).all()
            for row in olt_rows:
                metric = telnet_metrics.get(row.onu_id) or {}
                distance = metric.get("distance_m")
                signal = metric.get("signal_dbm")
                lrt = metric.get("lrt")
                ldr = metric.get("ldr")
                metric_status = metric.get("status")
                if isinstance(distance, int) and row.distance_m is None:
                    row.distance_m = distance
                row.signal_dbm = float(signal) if isinstance(signal, (float, int)) else None
                if isinstance(lrt, str):
                    lrt_text = lrt.strip()
                    row.lrt = lrt_text if lrt_text and lrt_text.upper() != "N/A" else None
                else:
                    row.lrt = None
                if isinstance(ldr, str):
                    ldr_text = ldr.strip()
                    row.ldr = ldr_text if ldr_text and ldr_text.upper() != "N/A" else None
                else:
                    row.ldr = None
                if isinstance(metric_status, str) and metric_status in {"Online", "Offline"}:
                    row.status = metric_status

        # Real-device fields sync: description/vlan/status directly from OLT CLI.
        if telnet_live_fields:
            olt_rows = db.query(OnuInventory).filter(OnuInventory.olt_id == olt.id).all()
            for row in olt_rows:
                live = telnet_live_fields.get(row.onu_id) or {}
                status_value = live.get("status")
                if isinstance(status_value, str) and status_value.strip() in {"Online", "Offline"}:
                    row.status = status_value.strip()
                description_value = live.get("description")
                row.description = (
                    description_value.strip()
                    if isinstance(description_value, str) and description_value.strip()
                    else None
                )
                vlan_value = live.get("vlan")
                row.vlan = str(vlan_value).strip() if vlan_value is not None and str(vlan_value).strip() else None

        # Distance fallback (per PON): some VSOL firmware exposes distance only at PON-level.
        try:
            pon_distance_rows = snmp_bulk_walk(
                olt.ip_address,
                olt.snmp_port,
                olt.community,
                "1.3.6.1.4.1.37950.1.1.5.10.1.2.2.1.9",
                max_rows=256,
                timeout=SNMP_TIMEOUT,
                retries=SNMP_RETRIES,
            )
            pon_distance_map: dict[int, int] = {}
            for oid, value in pon_distance_rows:
                parts = [p for p in oid.split(".") if p.isdigit()]
                if not parts:
                    continue
                pon_index = int(parts[-1])
                if not value.lstrip("-").isdigit():
                    continue
                distance_val = int(value)
                # Practical bounds for meter unit.
                if 1 <= distance_val <= 50000:
                    pon_distance_map[pon_index] = distance_val

            if pon_distance_map:
                olt_rows = db.query(OnuInventory).filter(OnuInventory.olt_id == olt.id).all()
                for row in olt_rows:
                    if row.distance_m is not None:
                        continue
                    pon = parse_pon_from_onu_id(row.onu_id)
                    if pon is None:
                        continue
                    distance_val = pon_distance_map.get(pon)
                    if distance_val is not None:
                        row.distance_m = distance_val
        except Exception:
            # Keep sync resilient if this optional fallback is unavailable.
            pass

    db.commit()
    return {"status": "ok", "updated": updated, "errors": errors}


@router.post("/{onu_id}/configure", response_model=OnuInventoryRead)
def configure_onu(
    onu_id: int,
    payload: OnuConfigurePayload,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> OnuInventory:
    onu = get_onu(db, onu_id)
    olt = db.query(Olt).filter(Olt.id == onu.olt_id).first()
    if not olt:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OLT not found")

    description = " ".join(payload.description.replace("\r", " ").replace("\n", " ").split())
    if not description:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Description cannot be empty")
    if len(description) > 32:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Description max length is 32")

    telnet_error = update_onu_description_via_telnet(olt, onu.onu_id, description)
    if telnet_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=telnet_error)

    onu.description = description
    db.commit()
    db.refresh(onu)
    return onu


@router.get("/{onu_id}", response_model=OnuInventoryRead)
def read_onu(
    onu_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> OnuInventory:
    return get_onu(db, onu_id)


@router.put("/{onu_id}", response_model=OnuInventoryRead)
def update_onu(
    onu_id: int,
    payload: OnuInventoryUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> OnuInventory:
    onu = get_onu(db, onu_id)
    data = payload.model_dump(exclude_unset=True)
    if "olt_id" in data:
        olt = db.query(Olt).filter(Olt.id == data["olt_id"]).first()
        if not olt:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OLT not found")
    for field, value in data.items():
        setattr(onu, field, value)
    db.commit()
    db.refresh(onu)
    return onu


@router.delete("/{onu_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_onu(
    onu_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin")),
) -> None:
    onu = get_onu(db, onu_id)
    db.delete(onu)
    db.commit()
