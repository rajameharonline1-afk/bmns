from datetime import date
from pathlib import Path
from uuid import uuid4

import routeros_api
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.deps import require_roles
from app.core.security import get_password_hash
from app.models.client import Client
from app.models.client_onboarding import ClientOnboarding
from app.models.configuration_item import ConfigurationItem
from app.models.network_device import DeviceType, NetworkDevice
from app.models.plan import Plan
from app.models.role import Role
from app.models.user import User
from app.schemas.client_list import (
    ClientListItem,
    ClientListOptions,
    ClientListQuery,
    ClientListResponse,
    ClientListStat,
    MonitorStatusRead,
    MonitorStatusUpdate,
)
from app.schemas.client import ClientCreate, ClientRead, ClientUpdate
from app.schemas.client_onboarding import (
    AddNewClientCreate,
    AddNewClientCodeSuggestionRead,
    AddNewClientOptionItem,
    AddNewClientOptions,
    AddNewClientRead,
    AddNewClientServerProfilesRead,
    AddNewClientUploadRead,
    AddNewClientUsernameCheckRead,
)

router = APIRouter()
UPLOAD_DIR = Path("uploads/client-onboarding")
ALLOWED_UPLOAD_KINDS = {"profile", "nid", "registration"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def get_client(db: Session, client_id: int) -> Client:
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


def _collect_unique(values: list[str | None]) -> list[str]:
    return sorted({value.strip() for value in values if value and value.strip()})


def _fmt_date(value: date | None) -> str:
    if not value:
        return ""
    return value.strftime("%Y %m %d")


def _generate_client_code(db: Session) -> str:
    latest_id = db.query(func.max(Client.id)).scalar() or 0
    for candidate in range(int(latest_id) + 1, int(latest_id) + 10000):
        code = f"C{candidate:05d}"
        exists = db.query(Client.id).filter(Client.client_code == code).first()
        if not exists:
            return code
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to generate unique client code")


def _sync_client_to_mikrotik_secret(
    db: Session,
    *,
    server_id: int,
    pppoe_username: str,
    pppoe_password: str,
    client_code: str,
    client_name: str,
    contact_number: str | None,
    zone_name: str | None,
    present_address: str | None,
    joining_date: date | None,
    package_name: str,
    monthly_bill: str,
    bill_expiry_date: date | None,
) -> None:
    mikrotik = (
        db.query(NetworkDevice)
        .filter(
            NetworkDevice.id == server_id,
            NetworkDevice.device_type == DeviceType.mikrotik,
        )
        .first()
    )
    if mikrotik is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected Mikrotik server not found.",
        )

    comment = (
        f"Client Code: {client_code} | "
        f"Client Name: {client_name} | "
        f"Contact Number: {contact_number or ''} | "
        f"Zone Name: {zone_name or ''} | "
        f"Present Address: {present_address or ''} | "
        f"Joining Date: {_fmt_date(joining_date)} | "
        f"Package Name: {package_name} | "
        f"Monthly Bill: {monthly_bill} | "
        f"Bill Expiry Date: {_fmt_date(bill_expiry_date)}"
    )

    pool = None
    try:
        pool = routeros_api.RouterOsApiPool(
            mikrotik.ip_address,
            username=mikrotik.api_username,
            password=mikrotik.api_password,
            port=mikrotik.api_port,
            plaintext_login=True,
            use_ssl=False,
        )
        api = pool.get_api()
        secret_resource = api.get_resource("/ppp/secret")
        existing = secret_resource.get(name=pppoe_username)
        if existing:
            secret_resource.set(
                id=existing[0][".id"],
                password=pppoe_password,
                service="pppoe",
                comment=comment,
            )
        else:
            secret_resource.add(
                name=pppoe_username,
                password=pppoe_password,
                service="pppoe",
                comment=comment,
            )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mikrotik secret sync failed: {exc}",
        ) from exc
    finally:
        if pool is not None:
            try:
                pool.disconnect()
            except Exception:
                pass


@router.post("/add-new/upload", response_model=AddNewClientUploadRead)
def upload_add_new_client_image(
    kind: str = Query(..., description="profile|nid|registration"),
    file: UploadFile = File(...),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> AddNewClientUploadRead:
    if kind not in ALLOWED_UPLOAD_KINDS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid upload kind")
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only jpeg/png/webp images are allowed")

    suffix = Path(file.filename or "").suffix.lower() or ".png"
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        suffix = ".png"

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{kind}_{uuid4().hex}{suffix}"
    absolute_path = UPLOAD_DIR / filename

    content = file.file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    absolute_path.write_bytes(content)

    return AddNewClientUploadRead(file_path=f"/uploads/client-onboarding/{filename}", kind=kind)


@router.get("/add-new/options", response_model=AddNewClientOptions)
def add_new_client_options(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> AddNewClientOptions:
    plans = db.query(Plan).order_by(Plan.id).all()
    employees = (
        db.query(User)
        .join(User.roles)
        .filter(Role.name.in_(["admin", "manager", "employee"]))
        .order_by(User.username)
        .all()
    )

    def item(value: str, label: str | None = None) -> AddNewClientOptionItem:
        return AddNewClientOptionItem(value=value, label=label or value)

    config_rows = (
        db.query(ConfigurationItem)
        .filter(ConfigurationItem.is_active.is_(True))
        .order_by(ConfigurationItem.id.asc())
        .all()
    )

    def by_kind(kind: str) -> list[ConfigurationItem]:
        return [row for row in config_rows if row.kind == kind and row.name]

    protocol_items = [item(row.name) for row in by_kind("protocol-type")] or [item("PPPoE"), item("DHCP"), item("Static")]
    zone_items = [item(row.name) for row in by_kind("zone")] or [item("Rajamehar")]
    sub_zone_items = [item(row.name) for row in by_kind("sub-zone")]
    box_items = [item(row.name) for row in by_kind("box")]
    connection_items = [item(row.name) for row in by_kind("connection-type")] or [item("Fiber")]
    client_type_items = [item(row.name) for row in by_kind("client-type")] or [item("Home")]
    billing_items = [item(row.name) for row in by_kind("billing-status")] or [item("Active")]
    district_items = [item(row.name) for row in by_kind("district")] or [item("Comilla")]
    upazila_items = [item(row.name) for row in by_kind("upazila")]

    return AddNewClientOptions(
        packages=[{"id": plan.id, "name": plan.name, "price": str(plan.price)} for plan in plans],
        servers=[
            item(str(device.id), f"{device.name} ({device.ip_address})")
            for device in db.query(NetworkDevice)
            .filter(NetworkDevice.device_type == DeviceType.mikrotik)
            .order_by(NetworkDevice.id)
            .all()
        ],
        protocol_types=protocol_items,
        zones=zone_items,
        sub_zones=sub_zone_items,
        boxes=box_items,
        connection_types=connection_items,
        client_types=client_type_items,
        billing_statuses=billing_items,
        employees=[item(str(user.id), user.username) for user in employees],
        districts=district_items,
        upazilas=upazila_items,
        references=[item("Facebook"), item("Friend"), item("Sales Team")],
    )


@router.get("/add-new/server-profiles", response_model=AddNewClientServerProfilesRead)
def add_new_client_server_profiles(
    server_id: int = Query(...),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> AddNewClientServerProfilesRead:
    mikrotik = (
        db.query(NetworkDevice)
        .filter(NetworkDevice.id == server_id, NetworkDevice.device_type == DeviceType.mikrotik)
        .first()
    )
    if mikrotik is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mikrotik server not found")

    pool = None
    try:
        pool = routeros_api.RouterOsApiPool(
            mikrotik.ip_address,
            username=mikrotik.api_username,
            password=mikrotik.api_password,
            port=mikrotik.api_port,
            plaintext_login=True,
            use_ssl=False,
        )
        api = pool.get_api()
        profile_resource = api.get_resource("/ppp/profile")
        profile_rows = profile_resource.get()
        profiles = sorted(
            {
                str(row.get("name", "")).strip()
                for row in profile_rows
                if str(row.get("name", "")).strip()
            }
        )
        return AddNewClientServerProfilesRead(server_id=server_id, profiles=profiles)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Profile fetch failed: {exc}") from exc
    finally:
        if pool is not None:
            try:
                pool.disconnect()
            except Exception:
                pass


@router.get("/add-new/username-check", response_model=AddNewClientUsernameCheckRead)
def add_new_client_username_check(
    server_id: int = Query(...),
    username: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> AddNewClientUsernameCheckRead:
    mikrotik = (
        db.query(NetworkDevice)
        .filter(NetworkDevice.id == server_id, NetworkDevice.device_type == DeviceType.mikrotik)
        .first()
    )
    if mikrotik is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mikrotik server not found")

    pool = None
    try:
        pool = routeros_api.RouterOsApiPool(
            mikrotik.ip_address,
            username=mikrotik.api_username,
            password=mikrotik.api_password,
            port=mikrotik.api_port,
            plaintext_login=True,
            use_ssl=False,
        )
        api = pool.get_api()
        secret_resource = api.get_resource("/ppp/secret")
        exists = bool(secret_resource.get(name=username.strip()))
        return AddNewClientUsernameCheckRead(available=not exists)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Username check failed: {exc}") from exc
    finally:
        if pool is not None:
            try:
                pool.disconnect()
            except Exception:
                pass


@router.get("/add-new/suggest-client-code", response_model=AddNewClientCodeSuggestionRead)
def suggest_client_code(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> AddNewClientCodeSuggestionRead:
    return AddNewClientCodeSuggestionRead(client_code=_generate_client_code(db))


@router.post("/add-new", response_model=AddNewClientRead, status_code=status.HTTP_201_CREATED)
def create_add_new_client(
    payload: AddNewClientCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> AddNewClientRead:
    existing_username = db.query(User).filter(User.username == payload.username).first()
    if existing_username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")

    email = (payload.email_address or "").strip()
    if not email:
        email = f"{payload.username}@client.local"

    existing_email = db.query(User).filter(User.email == email).first()
    if existing_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")

    package_id = payload.package_id
    if package_id is None:
        first_plan = db.query(Plan).order_by(Plan.id).first()
        if not first_plan:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No package found. Please create package first.")
        package_id = first_plan.id

    plan = db.query(Plan).filter(Plan.id == package_id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")

    client_role = db.query(Role).filter(Role.name == "client").first()
    if client_role is None:
        client_role = Role(name="client")
        db.add(client_role)
        db.flush()

    user = User(
        email=email,
        username=payload.username.strip(),
        hashed_password=get_password_hash(payload.password),
        is_active=True,
        is_superuser=False,
    )
    user.roles.append(client_role)
    db.add(user)
    db.flush()

    ip_address = (payload.ip_address or "").strip() or "0.0.0.0"
    mac_address = (payload.mac_address or "").strip() or "00:00:00:00:00:00"

    proposed_client_code = (payload.client_code or "").strip()
    if not proposed_client_code:
        proposed_client_code = _generate_client_code(db)
    existing_client_code = db.query(Client.id).filter(Client.client_code == proposed_client_code).first()
    if existing_client_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Client code already exists")

    client = Client(
        client_code=proposed_client_code,
        user_id=user.id,
        plan_id=plan.id,
        pppoe_username=payload.username.strip(),
        pppoe_password=payload.password,
        ip_address=ip_address,
        mac_address=mac_address,
        expiry_date=payload.expire_date,
    )
    db.add(client)
    db.flush()

    onboarding = ClientOnboarding(
        user_id=user.id,
        client_id=client.id,
        package_id=plan.id,
        customer_name=payload.customer_name.strip(),
        remarks=payload.remarks,
        occupation=payload.occupation,
        nid_or_certificate_no=payload.nid_or_certificate_no,
        registration_perm_no=payload.registration_perm_no,
        father_name=payload.father_name,
        mother_name=payload.mother_name,
        gender=payload.gender,
        date_of_birth=payload.date_of_birth,
        profile_picture_path=payload.profile_picture_path,
        nid_picture_path=payload.nid_picture_path,
        registration_picture_path=payload.registration_picture_path,
        map_latitude=payload.map_latitude,
        map_longitude=payload.map_longitude,
        mobile_number=payload.mobile_number,
        phone_number=payload.phone_number,
        district=payload.district,
        upazila=payload.upazila,
        road_no=payload.road_no,
        house_no=payload.house_no,
        village_no=payload.village_no,
        present_address=payload.present_address,
        permanent_address=payload.permanent_address if not payload.same_as_present_address else payload.present_address,
        same_as_present_address=payload.same_as_present_address,
        email_address=email,
        facebook_url=payload.facebook_url,
        linkedin_url=payload.linkedin_url,
        twitter_url=payload.twitter_url,
        serial=str(payload.server_id),
        protocol_type=payload.protocol_type,
        zone=payload.zone,
        sub_zone=payload.sub_zone,
        box=payload.box,
        connection_type=payload.connection_type,
        cable_required_meter=payload.cable_required_meter,
        fiber_code=payload.fiber_code,
        number_of_core=payload.number_of_core,
        core_color=payload.core_color,
        device=payload.device,
        device_serial_no=payload.device_serial_no,
        vendor=payload.vendor,
        purchase_date=payload.purchase_date,
        profile=payload.profile,
        client_type=payload.client_type,
        billing_status=payload.billing_status,
        owner_name_relation_in_billing=payload.owner_name_relation_in_billing,
        monthly_bill=payload.monthly_bill,
        billing_starting_from=payload.billing_starting_from,
        expire_date=payload.expire_date,
        reference_by=payload.reference_by,
        vat_percent_client=payload.vat_percent_client,
        connection_by=payload.connection_by,
        affiliate=None,
        send_greetings_sms=payload.send_greetings_sms,
    )
    db.add(onboarding)

    package_name = f"{plan.bandwidth_mbps}Mbps"
    monthly_bill_text = str(payload.monthly_bill if payload.monthly_bill is not None else plan.price)
    _sync_client_to_mikrotik_secret(
        db,
        server_id=payload.server_id,
        pppoe_username=payload.username.strip(),
        pppoe_password=payload.password,
        client_code=client.client_code,
        client_name=payload.customer_name.strip(),
        contact_number=payload.mobile_number,
        zone_name=payload.zone,
        present_address=payload.present_address,
        joining_date=payload.billing_starting_from,
        package_name=package_name,
        monthly_bill=monthly_bill_text,
        bill_expiry_date=payload.expire_date,
    )

    db.commit()
    db.refresh(onboarding)

    return AddNewClientRead(
        id=onboarding.id,
        user_id=user.id,
        client_id=client.id,
        client_code=client.client_code,
        customer_name=onboarding.customer_name,
        username=user.username,
    )


@router.get("/list-view", response_model=ClientListResponse)
def list_view_clients(
    server: str | None = Query(default=None),
    protocol_type: str | None = Query(default=None),
    profile: str | None = Query(default=None),
    zone: str | None = Query(default=None),
    sub_zone: str | None = Query(default=None),
    box: str | None = Query(default=None),
    package: str | None = Query(default=None),
    client_type: str | None = Query(default=None),
    connection_type: str | None = Query(default=None),
    b_status: str | None = Query(default=None),
    m_status: str | None = Query(default=None),
    custom_status: str | None = Query(default=None),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee", "reseller")),
) -> ClientListResponse:
    query_payload = ClientListQuery(
        server=server,
        protocol_type=protocol_type,
        profile=profile,
        zone=zone,
        sub_zone=sub_zone,
        box=box,
        package=package,
        client_type=client_type,
        connection_type=connection_type,
        b_status=b_status,
        m_status=m_status,
        custom_status=custom_status,
        from_date=from_date,
        to_date=to_date,
        search=search,
    )

    base_rows = (
        db.query(Client, ClientOnboarding, Plan, User)
        .outerjoin(ClientOnboarding, ClientOnboarding.client_id == Client.id)
        .outerjoin(Plan, Plan.id == Client.plan_id)
        .outerjoin(User, User.id == Client.user_id)
        .order_by(Client.id.desc())
        .all()
    )

    servers = _collect_unique(
        [
            device.name
            for device in db.query(NetworkDevice).filter(NetworkDevice.device_type == DeviceType.mikrotik).all()
        ]
    )

    options = ClientListOptions(
        servers=servers,
        protocol_types=_collect_unique([row[1].protocol_type if row[1] else None for row in base_rows]),
        profiles=_collect_unique([row[1].profile if row[1] else None for row in base_rows]),
        zones=_collect_unique([row[1].zone if row[1] else None for row in base_rows]),
        sub_zones=_collect_unique([row[1].sub_zone if row[1] else None for row in base_rows]),
        boxes=_collect_unique([row[1].box if row[1] else None for row in base_rows]),
        packages=_collect_unique([row[2].name if row[2] else None for row in base_rows]),
        client_types=_collect_unique([row[1].client_type if row[1] else None for row in base_rows]),
        connection_types=_collect_unique([row[1].connection_type if row[1] else None for row in base_rows]),
        billing_statuses=_collect_unique([row[1].billing_status if row[1] else None for row in base_rows]),
        monitoring_statuses=["On", "Off"],
        custom_statuses=["active", "suspended", "disconnected"],
    )

    today = func.current_date()
    running_clients = db.query(Client).filter(Client.connection_status == "active").count()
    new_clients = (
        db.query(Client)
        .filter(func.date(Client.created_at) == today)
        .count()
    )
    renewed_clients = (
        db.query(Client)
        .filter(
            Client.expiry_date.isnot(None),
            Client.expiry_date >= func.current_date(),
        )
        .count()
    )
    waiver_clients = (
        db.query(ClientOnboarding)
        .filter(or_(ClientOnboarding.monthly_bill == 0, ClientOnboarding.monthly_bill.is_(None)))
        .count()
    )

    stats = ClientListStat(
        running_clients=running_clients,
        new_clients=new_clients,
        renewed_clients=renewed_clients,
        waiver_clients=waiver_clients,
    )

    items: list[ClientListItem] = []
    for client, onboarding, plan, user in base_rows:
        customer_name = (
            onboarding.customer_name
            if onboarding and onboarding.customer_name
            else (user.username if user else f"Client-{client.id}")
        )
        package_speed = None
        if plan:
            package_speed = f"{plan.name}/{plan.bandwidth_mbps}M"

        row = ClientListItem(
            client_id=client.id,
            c_code=client.client_code,
            id_or_ip=client.pppoe_username or "",
            password=client.pppoe_password or "",
            customer_name=customer_name,
            mobile=onboarding.mobile_number if onboarding else None,
            zone=onboarding.zone if onboarding else None,
            connection_type=onboarding.connection_type if onboarding else None,
            client_type=onboarding.client_type if onboarding else None,
            package_speed=package_speed,
            monthly_bill=(onboarding.monthly_bill if onboarding else None) or (plan.price if plan else None),
            mac_address=client.mac_address,
            server=servers[0] if servers else None,
            billing_status=(onboarding.billing_status if onboarding else None) or str(client.connection_status),
            monitoring_status=onboarding.monitoring_status if onboarding else True,
        )

        if query_payload.server and row.server != query_payload.server:
            continue
        if query_payload.protocol_type and (not onboarding or onboarding.protocol_type != query_payload.protocol_type):
            continue
        if query_payload.profile and (not onboarding or onboarding.profile != query_payload.profile):
            continue
        if query_payload.zone and row.zone != query_payload.zone:
            continue
        if query_payload.sub_zone and (not onboarding or onboarding.sub_zone != query_payload.sub_zone):
            continue
        if query_payload.box and (not onboarding or onboarding.box != query_payload.box):
            continue
        if query_payload.package and (not plan or plan.name != query_payload.package):
            continue
        if query_payload.client_type and row.client_type != query_payload.client_type:
            continue
        if query_payload.connection_type and row.connection_type != query_payload.connection_type:
            continue
        if query_payload.b_status and row.billing_status != query_payload.b_status:
            continue
        if query_payload.m_status:
            expected = query_payload.m_status.lower() == "on"
            if row.monitoring_status != expected:
                continue
        if query_payload.custom_status and str(client.connection_status) != query_payload.custom_status:
            continue
        if query_payload.search:
            text = f"{row.c_code} {row.id_or_ip} {row.customer_name} {row.mobile or ''}"
            if query_payload.search.lower() not in text.lower():
                continue

        items.append(row)

    return ClientListResponse(stats=stats, options=options, items=items)


@router.patch("/{client_id}/monitor-status", response_model=MonitorStatusRead)
def update_monitor_status(
    client_id: int,
    payload: MonitorStatusUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> MonitorStatusRead:
    client = get_client(db, client_id)
    onboarding = db.query(ClientOnboarding).filter(ClientOnboarding.client_id == client.id).first()
    if onboarding is None:
        user = db.query(User).filter(User.id == client.user_id).first()
        onboarding = ClientOnboarding(
            user_id=client.user_id,
            client_id=client.id,
            package_id=client.plan_id,
            customer_name=user.username if user else f"Client-{client.id}",
        )
        db.add(onboarding)

    onboarding.monitoring_status = payload.enabled
    db.commit()

    return MonitorStatusRead(client_id=client.id, monitoring_status=onboarding.monitoring_status)


@router.post("/", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> Client:
    if db.query(Client.id).filter(Client.client_code == payload.client_code).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Client code already exists")
    client = Client(**payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/", response_model=list[ClientRead])
def list_clients(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee", "reseller")),
) -> list[Client]:
    return db.query(Client).order_by(Client.id).all()


@router.get("/{client_id}", response_model=ClientRead)
def read_client(
    client_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee", "reseller")),
) -> Client:
    return get_client(db, client_id)


@router.put("/{client_id}", response_model=ClientRead)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> Client:
    client = get_client(db, client_id)
    payload_data = payload.model_dump(exclude_unset=True)
    candidate_code = payload_data.get("client_code")
    if candidate_code and candidate_code != client.client_code:
        if db.query(Client.id).filter(Client.client_code == candidate_code).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Client code already exists")
    for field, value in payload_data.items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> None:
    client = get_client(db, client_id)
    db.delete(client)
    db.commit()
