import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
import routeros_api
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.deps import require_roles
from app.models.client import Client
from app.models.mikrotik_import import MikrotikImportRecord
from app.models.network_device import DeviceType, NetworkDevice
from app.schemas.mikrotik_import import (
    ImportCommitRequest,
    ImportCommitResponse,
    ImportOptionsResponse,
    ImportPreviewRequest,
    ImportPreviewResponse,
    ImportPreviewRow,
    ImportRowUpdateRequest,
    ImportRouterOption,
)
from app.schemas.mikrotik_server import MikrotikServerCreate, MikrotikServerRead, MikrotikServerUpdate

router = APIRouter()
MOBILE_RE = re.compile(r"(?:\+?88)?(01[3-9]\d{8})")


def to_read(device: NetworkDevice) -> MikrotikServerRead:
    return MikrotikServerRead(
        id=device.id,
        server_name=device.name,
        server_ip=device.ip_address,
        username=device.api_username,
        password=device.api_password,
        api_port=device.api_port,
        mikrotik_version=device.mikrotik_version or "v3",
        request_timeout_sec=device.request_timeout_sec or 10,
        is_active=device.is_active,
    )


def get_server(db: Session, server_id: int) -> NetworkDevice:
    server = (
        db.query(NetworkDevice)
        .filter(NetworkDevice.id == server_id, NetworkDevice.device_type == DeviceType.mikrotik)
        .first()
    )
    if not server:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mikrotik server not found")
    return server


def _connect_router(server: NetworkDevice):
    return routeros_api.RouterOsApiPool(
        server.ip_address,
        username=server.api_username,
        password=server.api_password,
        port=server.api_port,
        plaintext_login=True,
        use_ssl=False,
    )


def _router_option(device: NetworkDevice) -> ImportRouterOption:
    return ImportRouterOption(
        id=device.id,
        name=device.name or f"Mikrotik-{device.ip_address}",
        ip=device.ip_address,
    )


def _parse_secret_comment(comment: str) -> tuple[str | None, str | None]:
    if not comment:
        return None, None

    raw = comment.strip()
    mobile_match = MOBILE_RE.search(raw)
    mobile = mobile_match.group(1) if mobile_match else None

    client_name = raw
    if mobile:
        client_name = client_name.replace(mobile, " ")

    client_name = re.sub(r"\b(client\s*name|name)\s*[:\-]\s*", "", client_name, flags=re.IGNORECASE)
    client_name = re.sub(r"\s+", " ", client_name).strip(" ,|:-")
    client_name = client_name or None
    return client_name, mobile


@router.post("/", response_model=MikrotikServerRead, status_code=status.HTTP_201_CREATED)
def create_server(
    payload: MikrotikServerCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> MikrotikServerRead:
    existing = db.query(NetworkDevice).filter(NetworkDevice.ip_address == payload.server_ip).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Server IP already exists")

    name = payload.server_name or f"Mikrotik-{payload.server_ip}"
    device = NetworkDevice(
        name=name,
        device_type=DeviceType.mikrotik,
        ip_address=payload.server_ip,
        api_username=payload.username,
        api_password=payload.password,
        api_port=payload.api_port,
        mikrotik_version=payload.mikrotik_version,
        request_timeout_sec=payload.request_timeout_sec,
        is_active=payload.is_active,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return to_read(device)


@router.get("/", response_model=list[MikrotikServerRead])
def list_servers(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> list[MikrotikServerRead]:
    devices = (
        db.query(NetworkDevice)
        .filter(NetworkDevice.device_type == DeviceType.mikrotik)
        .order_by(NetworkDevice.id)
        .all()
    )
    return [to_read(device) for device in devices]


@router.put("/{server_id}", response_model=MikrotikServerRead)
def update_server(
    server_id: int,
    payload: MikrotikServerUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> MikrotikServerRead:
    server = get_server(db, server_id)

    data = payload.model_dump(exclude_unset=True)
    if "server_ip" in data:
        new_ip = data.pop("server_ip")
        existing = (
            db.query(NetworkDevice)
            .filter(NetworkDevice.ip_address == new_ip, NetworkDevice.id != server.id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Server IP already exists")
        server.ip_address = new_ip
    if "username" in data:
        server.api_username = data.pop("username")
    if "password" in data:
        server.api_password = data.pop("password")
    if "api_port" in data:
        server.api_port = data.pop("api_port")
    if "mikrotik_version" in data:
        server.mikrotik_version = data.pop("mikrotik_version")
    if "request_timeout_sec" in data:
        server.request_timeout_sec = data.pop("request_timeout_sec")
    if "is_active" in data:
        server.is_active = data.pop("is_active")
    if "server_name" in data:
        server.name = data.pop("server_name")

    db.commit()
    db.refresh(server)
    return to_read(server)


@router.patch("/{server_id}/toggle", response_model=MikrotikServerRead)
def toggle_server(
    server_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> MikrotikServerRead:
    server = get_server(db, server_id)
    server.is_active = not server.is_active
    db.commit()
    db.refresh(server)
    return to_read(server)


@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_server(
    server_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin")),
) -> None:
    server = get_server(db, server_id)
    db.delete(server)
    db.commit()


@router.post("/{server_id}/sync")
def sync_server(
    server_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> dict:
    server = get_server(db, server_id)
    pool = None
    try:
        pool = routeros_api.RouterOsApiPool(
            server.ip_address,
            username=server.api_username,
            password=server.api_password,
            port=server.api_port,
            plaintext_login=True,
            use_ssl=False,
        )
        api = pool.get_api()
        secret_resource = api.get_resource("/ppp/secret")
        secrets = secret_resource.get()
        app_clients = db.query(Client).order_by(Client.id).all()
        app_by_user = {
            client.pppoe_username.strip(): client
            for client in app_clients
            if client.pppoe_username and client.pppoe_username.strip()
        }
        secret_by_user = {
            str(item.get("name", "")).strip(): item
            for item in secrets
            if str(item.get("name", "")).strip()
        }

        pushed_created = 0
        pushed_updated = 0
        for client in app_clients:
            username = (client.pppoe_username or "").strip()
            password = client.pppoe_password or ""
            if not username:
                continue
            secret = secret_by_user.get(username)
            if secret is None:
                secret_resource.add(name=username, password=password, service="pppoe")
                pushed_created += 1
                continue
            router_password = str(secret.get("password", ""))
            if router_password != password:
                secret_resource.set(id=secret[".id"], password=password, service="pppoe")
                pushed_updated += 1

        # Refresh secrets after push to avoid pulling stale pre-update passwords.
        refreshed_secrets = secret_resource.get()
        refreshed_secret_by_user = {
            str(item.get("name", "")).strip(): item
            for item in refreshed_secrets
            if str(item.get("name", "")).strip()
        }

        pulled_updated = 0
        skipped_router_only = 0
        for username, secret in refreshed_secret_by_user.items():
            client = app_by_user.get(username)
            if client is None:
                skipped_router_only += 1
                continue
            router_password = str(secret.get("password", ""))
            if router_password and client.pppoe_password != router_password:
                client.pppoe_password = router_password
                pulled_updated += 1

        db.commit()
        return {
            "status": "ok",
            "server_id": server.id,
            "server_ip": server.ip_address,
            "pushed_created": pushed_created,
            "pushed_updated": pushed_updated,
            "pulled_updated": pulled_updated,
            "skipped_router_only": skipped_router_only,
        }
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Mikrotik sync failed: {exc}") from exc
    finally:
        if pool is not None:
            try:
                pool.disconnect()
            except Exception:
                pass


@router.get("/import-from-mikrotik/options", response_model=ImportOptionsResponse)
def get_import_options(
    router_id: int | None = None,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> ImportOptionsResponse:
    routers = (
        db.query(NetworkDevice)
        .filter(NetworkDevice.device_type == DeviceType.mikrotik)
        .order_by(NetworkDevice.id)
        .all()
    )
    if not routers:
        return ImportOptionsResponse(routers=[], profiles=[])

    selected = routers[0]
    if router_id:
        selected = get_server(db, router_id)

    profiles: list[str] = []
    pool = None
    try:
        pool = _connect_router(selected)
        api = pool.get_api()
        profile_resource = api.get_resource("/ppp/profile")
        rows = profile_resource.get()
        profiles = sorted(
            {
                str(row.get("name", "")).strip()
                for row in rows
                if str(row.get("name", "")).strip()
            }
        )
    except Exception:
        profiles = []
    finally:
        if pool is not None:
            try:
                pool.disconnect()
            except Exception:
                pass

    return ImportOptionsResponse(
        routers=[_router_option(router) for router in routers],
        profiles=profiles,
    )


@router.post("/import-from-mikrotik/preview", response_model=ImportPreviewResponse)
def preview_import_from_mikrotik(
    payload: ImportPreviewRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> ImportPreviewResponse:
    server = get_server(db, payload.router_id)
    pool = None
    try:
        pool = _connect_router(server)
        api = pool.get_api()
        secret_resource = api.get_resource("/ppp/secret")
        rows = secret_resource.get()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Preview failed: {exc}") from exc
    finally:
        if pool is not None:
            try:
                pool.disconnect()
            except Exception:
                pass

    preview_rows: list[ImportPreviewRow] = []
    package_missing = False
    for row in rows:
        pppoe_id = str(row.get("name", "")).strip()
        if not pppoe_id:
            continue

        profile = str(row.get("profile", "")).strip() or None
        if payload.profile and payload.profile.strip() and profile != payload.profile.strip():
            continue

        comment = str(row.get("comment", "")).strip()
        parsed_name, parsed_mobile = _parse_secret_comment(comment)
        status = "active" if str(row.get("disabled", "false")).lower() in {"false", "0", "no"} else "inactive"

        package_value = profile if payload.import_package_and_bill else None
        if payload.import_package_and_bill and not package_value:
            package_missing = True

        preview_rows.append(
            ImportPreviewRow(
                pppoe_id=pppoe_id,
                password=str(row.get("password", "")).strip() if payload.import_pppoe_passwords else None,
                comment=comment or None,
                client=parsed_name if payload.import_client_name else None,
                mobile=parsed_mobile if payload.import_mobile else None,
                profile=profile,
                package=package_value,
                price=None,
                status=status if payload.import_status else None,
            )
        )

    warnings: list[str] = []
    if package_missing:
        warnings.append("Some profiles did not match any package.")

    return ImportPreviewResponse(
        router=_router_option(server),
        invoice_month=payload.invoice_month,
        rows=preview_rows,
        package_missing=package_missing,
        warnings=warnings,
    )


@router.post("/import-from-mikrotik/update-row", response_model=ImportPreviewRow)
def update_import_row_on_router(
    payload: ImportRowUpdateRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> ImportPreviewRow:
    server = get_server(db, payload.router_id)
    pool = None
    try:
        pool = _connect_router(server)
        api = pool.get_api()
        secret_resource = api.get_resource("/ppp/secret")
        matches = secret_resource.get(name=payload.pppoe_id)
        if not matches:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PPPoE secret not found")

        secret = matches[0]
        updates: dict[str, str] = {"id": secret[".id"]}
        if payload.password is not None:
            updates["password"] = payload.password
        if payload.profile is not None and payload.profile.strip():
            updates["profile"] = payload.profile.strip()
        if payload.status is not None:
            updates["disabled"] = "false" if payload.status.lower() == "active" else "true"

        parts = [payload.client or "", payload.mobile or ""]
        comment = " ".join(part.strip() for part in parts if part and part.strip()).strip()
        if comment:
            updates["comment"] = comment
        secret_resource.set(**updates)

        refreshed = secret_resource.get(name=payload.pppoe_id)[0]
        parsed_name, parsed_mobile = _parse_secret_comment(str(refreshed.get("comment", "")).strip())
        status = "active" if str(refreshed.get("disabled", "false")).lower() in {"false", "0", "no"} else "inactive"
        return ImportPreviewRow(
            pppoe_id=payload.pppoe_id,
            password=str(refreshed.get("password", "")).strip() or None,
            comment=str(refreshed.get("comment", "")).strip() or None,
            client=payload.client if payload.client is not None else parsed_name,
            mobile=payload.mobile if payload.mobile is not None else parsed_mobile,
            profile=str(refreshed.get("profile", "")).strip() or None,
            package=payload.package,
            price=None,
            status=status,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Update failed: {exc}") from exc
    finally:
        if pool is not None:
            try:
                pool.disconnect()
            except Exception:
                pass


@router.post("/import-from-mikrotik/commit", response_model=ImportCommitResponse)
def commit_import_from_mikrotik(
    payload: ImportCommitRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> ImportCommitResponse:
    server = get_server(db, payload.router_id)
    imported = 0
    updated_clients = 0
    created_clients = 0
    updated_router_secrets = 0

    existing_clients = {
        client.pppoe_username: client
        for client in db.query(Client).filter(Client.pppoe_username.isnot(None)).all()
    }

    pool = None
    try:
        pool = _connect_router(server)
        api = pool.get_api()
        secret_resource = api.get_resource("/ppp/secret")

        for row in payload.selected_rows:
            imported += 1
            record = (
                db.query(MikrotikImportRecord)
                .filter(
                    MikrotikImportRecord.server_id == server.id,
                    MikrotikImportRecord.pppoe_id == row.pppoe_id,
                )
                .first()
            )
            if record is None:
                record = MikrotikImportRecord(
                    server_id=server.id,
                    pppoe_id=row.pppoe_id,
                )
                db.add(record)
            record.invoice_month = payload.invoice_month
            record.password = row.password
            record.client_name = row.client
            record.mobile = row.mobile
            record.profile = row.profile
            record.package = row.package
            record.price = row.price
            record.status = row.status
            record.imported_at = datetime.utcnow()

            current_client = existing_clients.get(row.pppoe_id)
            if current_client is not None and row.password:
                if current_client.pppoe_password != row.password:
                    current_client.pppoe_password = row.password
                    updated_clients += 1

            secret_matches = secret_resource.get(name=row.pppoe_id)
            if secret_matches:
                secret = secret_matches[0]
                updates: dict[str, str] = {"id": secret[".id"]}
                should_update = False
                if row.password is not None and str(secret.get("password", "")) != row.password:
                    updates["password"] = row.password
                    should_update = True
                if row.profile is not None and str(secret.get("profile", "")).strip() != row.profile:
                    updates["profile"] = row.profile
                    should_update = True
                if row.status is not None:
                    disabled_target = "false" if row.status.lower() == "active" else "true"
                    if str(secret.get("disabled", "false")).lower() != disabled_target:
                        updates["disabled"] = disabled_target
                        should_update = True
                comment_target = " ".join(part for part in [row.client or "", row.mobile or ""] if part).strip()
                if comment_target and str(secret.get("comment", "")).strip() != comment_target:
                    updates["comment"] = comment_target
                    should_update = True

                if should_update:
                    secret_resource.set(**updates)
                    updated_router_secrets += 1

        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Commit failed: {exc}") from exc
    finally:
        if pool is not None:
            try:
                pool.disconnect()
            except Exception:
                pass

    return ImportCommitResponse(
        imported=imported,
        updated_clients=updated_clients,
        created_clients=created_clients,
        updated_router_secrets=updated_router_secrets,
    )
