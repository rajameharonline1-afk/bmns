import json
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.deps import require_roles
from app.models.configuration_item import ConfigurationItem
from app.models.plan import Plan
from app.schemas.configuration_item import (
    ConfigurationItemCreate,
    ConfigurationItemListRead,
    ConfigurationItemRead,
    ConfigurationItemUpdate,
    ConfigurationItemUploadRead,
)
from app.schemas.landing import LandingHomeContent, LandingMetric, LandingPageContent, LandingPlan

router = APIRouter()

UPLOAD_DIR = Path("uploads/configuration")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_KINDS = {
    "zone",
    "sub-zone",
    "box",
    "connection-type",
    "client-type",
    "protocol-type",
    "billing-status",
    "package",
    "district",
    "upazila",
    "landing-home",
    "landing-plan",
    "landing-metric",
}
UPLOAD_IMAGE_KINDS = {"client-type", "landing-home"}
TOGGLE_KINDS = {"connection-type", "protocol-type", "billing-status"}

DEFAULT_LANDING_HOME = LandingHomeContent(
    logo_text="BM",
    logo_image_path=None,
    brand_name="BMNS Fiber",
    brand_subtitle="Smart broadband operations",
    hero_tagline="Always-on fiber",
    hero_title="Billing, automation, and real-time network observability for modern ISPs.",
    hero_description="Offer smart plans, monitor OLTs and Mikrotiks live, and let customers pay on demand-all from a unified platform.",
    primary_cta_label="Explore Packages",
    primary_cta_href="#plans",
    secondary_cta_label="Coverage Areas",
    secondary_cta_href="#coverage",
    spotlight_title="Metro North + Riverline",
    spotlight_description="1200+ active ONUs monitored, 98.6% uptime, and 24/7 NOC response.",
    slider_images=[],
)


def _validate_kind(kind: str) -> str:
    if kind not in ALLOWED_KINDS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported configuration kind")
    return kind


def _get_item(db: Session, kind: str, item_id: int) -> ConfigurationItem:
    item = db.query(ConfigurationItem).filter(ConfigurationItem.id == item_id, ConfigurationItem.kind == kind).first()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Configuration item not found")
    return item


def _sync_package_plan(db: Session, item: ConfigurationItem) -> None:
    if item.kind != "package":
        return
    if not item.name or item.price is None or not item.bandwidth_allocation_mb:
        return

    plan = None
    if item.linked_plan_id:
        plan = db.query(Plan).filter(Plan.id == item.linked_plan_id).first()
    if plan is None:
        plan = db.query(Plan).filter(Plan.name == item.name).first()

    if plan is None:
        plan = Plan(
            name=item.name,
            bandwidth_mbps=item.bandwidth_allocation_mb,
            price=item.price,
            currency="BDT",
        )
        db.add(plan)
        db.flush()
    else:
        plan.name = item.name
        plan.bandwidth_mbps = item.bandwidth_allocation_mb
        plan.price = item.price
        if not plan.currency:
            plan.currency = "BDT"

    item.linked_plan_id = plan.id


def _parse_landing_home(item: ConfigurationItem | None) -> LandingHomeContent:
    if not item or not item.details:
        return DEFAULT_LANDING_HOME
    try:
        payload = json.loads(item.details)
        return LandingHomeContent(**payload)
    except (ValueError, TypeError):
        return DEFAULT_LANDING_HOME


@router.get("/public/landing", response_model=LandingPageContent)
def get_public_landing_content(db: Session = Depends(get_db)) -> LandingPageContent:
    home_item = (
        db.query(ConfigurationItem)
        .filter(ConfigurationItem.kind == "landing-home")
        .order_by(ConfigurationItem.id.desc())
        .first()
    )
    metrics_rows = (
        db.query(ConfigurationItem)
        .filter(ConfigurationItem.kind == "landing-metric")
        .order_by(ConfigurationItem.id.asc())
        .all()
    )
    plans_rows = (
        db.query(ConfigurationItem)
        .filter(ConfigurationItem.kind == "landing-plan")
        .order_by(ConfigurationItem.id.asc())
        .all()
    )

    metrics = [
        LandingMetric(id=row.id, label=row.name, value=row.details or "")
        for row in metrics_rows
        if row.name and row.details
    ]
    plans = [
        LandingPlan(
            id=row.id,
            name=row.name,
            speed=row.package_type or "-",
            description=row.details or "",
            price=str(row.price) if row.price is not None else "-",
        )
        for row in plans_rows
        if row.name
    ]

    if not metrics:
        metrics = [
            LandingMetric(id=0, label="Latency (avg)", value="8ms"),
            LandingMetric(id=0, label="Packet loss", value="0.3%"),
            LandingMetric(id=0, label="Fiber kilometers", value="420 km"),
        ]
    if not plans:
        plans = [
            LandingPlan(id=0, name="Starter", speed="50 Mbps", description="Unlimited night data + priority support.", price="18"),
            LandingPlan(id=0, name="Growth", speed="150 Mbps", description="Unlimited night data + priority support.", price="39"),
            LandingPlan(id=0, name="Ultra", speed="1 Gbps", description="Unlimited night data + priority support.", price="89"),
        ]

    return LandingPageContent(
        home=_parse_landing_home(home_item),
        metrics=metrics,
        plans=plans,
    )


@router.post("/image-upload", response_model=ConfigurationItemUploadRead)
def upload_configuration_image(
    kind: str = Query(..., description="currently supported: client-type, landing-home"),
    file: UploadFile = File(...),
    _user=Depends(require_roles("admin", "manager")),
) -> ConfigurationItemUploadRead:
    if kind not in UPLOAD_IMAGE_KINDS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported upload kind")
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only jpeg/png/webp images are allowed")

    suffix = Path(file.filename or "").suffix.lower() or ".png"
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        suffix = ".png"

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{kind.replace('-', '_')}_{uuid4().hex}{suffix}"
    absolute_path = UPLOAD_DIR / filename
    content = file.file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    absolute_path.write_bytes(content)
    return ConfigurationItemUploadRead(file_path=f"/uploads/configuration/{filename}")


@router.get("/{kind}", response_model=ConfigurationItemListRead)
def list_configuration_items(
    kind: str,
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> ConfigurationItemListRead:
    kind = _validate_kind(kind)
    query = db.query(ConfigurationItem).filter(ConfigurationItem.kind == kind)
    if search:
        query = query.filter(ConfigurationItem.name.ilike(f"%{search.strip()}%"))

    total = query.count()
    rows = (
        query.order_by(ConfigurationItem.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return ConfigurationItemListRead(total=total, page=page, page_size=page_size, items=rows)


@router.get("/{kind}/all", response_model=list[ConfigurationItemRead])
def list_all_configuration_items(
    kind: str,
    active_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> list[ConfigurationItem]:
    kind = _validate_kind(kind)
    query = db.query(ConfigurationItem).filter(ConfigurationItem.kind == kind)
    if active_only:
        query = query.filter(ConfigurationItem.is_active.is_(True))
    return query.order_by(ConfigurationItem.id.asc()).all()


@router.post("/{kind}", response_model=ConfigurationItemRead, status_code=status.HTTP_201_CREATED)
def create_configuration_item(
    kind: str,
    payload: ConfigurationItemCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> ConfigurationItem:
    kind = _validate_kind(kind)
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is required")

    if kind == "sub-zone" and not (payload.zone_name or "").strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Zone is required for Sub Zone")
    if kind == "box":
        if not (payload.zone_name or "").strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Zone is required for Box")
        if not (payload.sub_zone_name or "").strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sub Zone is required for Box")

    item = ConfigurationItem(
        kind=kind,
        name=name,
        details=payload.details,
        zone_name=payload.zone_name,
        sub_zone_name=payload.sub_zone_name,
        featured_image_path=payload.featured_image_path,
        is_active=payload.is_active,
        package_type=payload.package_type,
        bandwidth_allocation_mb=payload.bandwidth_allocation_mb,
        price=payload.price,
        vas=payload.vas,
        show_on_client_profile=payload.show_on_client_profile,
    )
    db.add(item)
    db.flush()
    _sync_package_plan(db, item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{kind}/{item_id}", response_model=ConfigurationItemRead)
def update_configuration_item(
    kind: str,
    item_id: int,
    payload: ConfigurationItemUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> ConfigurationItem:
    kind = _validate_kind(kind)
    item = _get_item(db, kind, item_id)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and (data["name"] or "").strip() == "":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is required")
    for field, value in data.items():
        setattr(item, field, value.strip() if isinstance(value, str) else value)

    _sync_package_plan(db, item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{kind}/{item_id}/toggle", response_model=ConfigurationItemRead)
def toggle_configuration_item(
    kind: str,
    item_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> ConfigurationItem:
    kind = _validate_kind(kind)
    if kind not in TOGGLE_KINDS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Toggle not available for this kind")
    item = _get_item(db, kind, item_id)
    item.is_active = not item.is_active
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{kind}/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_configuration_item(
    kind: str,
    item_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin")),
) -> None:
    kind = _validate_kind(kind)
    item = _get_item(db, kind, item_id)
    db.delete(item)
    db.commit()
