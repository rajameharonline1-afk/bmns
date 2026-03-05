from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from app.models import Client, Plan, User
from app.models.network_device import DeviceType, NetworkDevice
from app.core.security import get_password_hash


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_login_and_me(client, admin_user, admin_token):
    response = client.get("/api/users/me", headers=auth_headers(admin_token))
    assert response.status_code == 200
    payload = response.json()
    assert payload["username"] == "admin"
    assert "admin" in payload["roles"]


def test_plan_crud(client, admin_token):
    payload = {
        "name": "Starter",
        "bandwidth_mbps": 25,
        "price": "29.99",
        "currency": "USD",
    }
    create = client.post("/api/plans/", json=payload, headers=auth_headers(admin_token))
    assert create.status_code == 201
    plan_id = create.json()["id"]

    listing = client.get("/api/plans/", headers=auth_headers(admin_token))
    assert listing.status_code == 200
    assert len(listing.json()) == 1

    read = client.get(f"/api/plans/{plan_id}", headers=auth_headers(admin_token))
    assert read.status_code == 200
    assert read.json()["name"] == "Starter"

    update = client.put(
        f"/api/plans/{plan_id}",
        json={"bandwidth_mbps": 50, "price": "39.99"},
        headers=auth_headers(admin_token),
    )
    assert update.status_code == 200
    assert update.json()["bandwidth_mbps"] == 50

    delete = client.delete(f"/api/plans/{plan_id}", headers=auth_headers(admin_token))
    assert delete.status_code == 204

    missing = client.get(f"/api/plans/{plan_id}", headers=auth_headers(admin_token))
    assert missing.status_code == 404


def test_client_crud(client, admin_token, db_session):
    plan = Plan(name="Basic", bandwidth_mbps=10, price=Decimal("10.00"), currency="USD")
    db_session.add(plan)
    db_session.flush()

    user = User(
        email="client@example.com",
        username="client1",
        hashed_password=get_password_hash("secret"),
        is_active=True,
        is_superuser=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(plan)
    db_session.refresh(user)

    payload = {
        "user_id": user.id,
        "plan_id": plan.id,
        "pppoe_username": "pppoe1",
        "pppoe_password": "pppoe-pass",
        "ip_address": "192.168.1.10",
        "mac_address": "AA:BB:CC:DD:EE:FF",
        "connection_status": "active",
        "expiry_date": str(date.today()),
    }
    create = client.post("/api/clients/", json=payload, headers=auth_headers(admin_token))
    assert create.status_code == 201
    client_id = create.json()["id"]

    listing = client.get("/api/clients/", headers=auth_headers(admin_token))
    assert listing.status_code == 200
    assert len(listing.json()) == 1

    update = client.put(
        f"/api/clients/{client_id}",
        json={"connection_status": "suspended"},
        headers=auth_headers(admin_token),
    )
    assert update.status_code == 200
    assert update.json()["connection_status"] == "suspended"

    delete = client.delete(f"/api/clients/{client_id}", headers=auth_headers(admin_token))
    assert delete.status_code == 204


def test_network_device_crud(client, admin_token):
    payload = {
        "name": "Core-MT",
        "device_type": "mikrotik",
        "ip_address": "10.0.0.1",
        "api_username": "admin",
        "api_password": "password",
        "snmp_community": "public",
        "api_port": 8728,
        "is_active": True,
    }
    create = client.post("/api/network-devices/", json=payload, headers=auth_headers(admin_token))
    assert create.status_code == 201
    device_id = create.json()["id"]

    update = client.put(
        f"/api/network-devices/{device_id}",
        json={"api_port": 8729, "is_active": False},
        headers=auth_headers(admin_token),
    )
    assert update.status_code == 200
    assert update.json()["api_port"] == 8729

    delete = client.delete(f"/api/network-devices/{device_id}", headers=auth_headers(admin_token))
    assert delete.status_code == 204


def test_invoice_flow(client, admin_token, db_session):
    plan = Plan(name="Pro", bandwidth_mbps=100, price=Decimal("80.00"), currency="USD")
    db_session.add(plan)
    db_session.flush()

    user = User(
        email="billing@example.com",
        username="billing1",
        hashed_password=get_password_hash("secret"),
        is_active=True,
        is_superuser=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(plan)
    db_session.refresh(user)

    client_row = Client(
        user_id=user.id,
        plan_id=plan.id,
        pppoe_username="pppoe-billing",
        pppoe_password="pppoe-pass",
        ip_address="192.168.1.20",
        mac_address="11:22:33:44:55:66",
    )
    db_session.add(client_row)
    db_session.commit()
    db_session.refresh(client_row)

    payload = {
        "client_id": client_row.id,
        "issue_date": str(date.today()),
        "due_date": str(date.today()),
        "status": "issued",
        "total_amount": "0.00",
        "currency": "USD",
        "items": [
            {
                "plan_id": plan.id,
                "description": "Monthly plan",
                "quantity": 1,
                "unit_price": "80.00",
                "line_total": "80.00",
            }
        ],
    }
    create = client.post("/api/invoices/", json=payload, headers=auth_headers(admin_token))
    assert create.status_code == 201
    invoice_id = create.json()["id"]
    assert create.json()["total_amount"] == "80.00"

    read = client.get(f"/api/invoices/{invoice_id}", headers=auth_headers(admin_token))
    assert read.status_code == 200
    assert read.json()["items"][0]["description"] == "Monthly plan"

    delete = client.delete(f"/api/invoices/{invoice_id}", headers=auth_headers(admin_token))
    assert delete.status_code == 204


def test_mikrotik_server_crud_with_extended_fields(client, admin_token):
    create = client.post(
        "/api/mikrotik-servers/",
        json={
            "server_name": "CORE",
            "server_ip": "10.1.1.1",
            "username": "admin",
            "password": "pass123",
            "api_port": 8728,
            "mikrotik_version": "v3",
            "request_timeout_sec": 12,
            "is_active": True,
        },
        headers=auth_headers(admin_token),
    )
    assert create.status_code == 201
    payload = create.json()
    assert payload["mikrotik_version"] == "v3"
    assert payload["request_timeout_sec"] == 12

    update = client.put(
        f"/api/mikrotik-servers/{payload['id']}",
        json={"mikrotik_version": "v2", "request_timeout_sec": 8},
        headers=auth_headers(admin_token),
    )
    assert update.status_code == 200
    updated = update.json()
    assert updated["mikrotik_version"] == "v2"
    assert updated["request_timeout_sec"] == 8


def test_mikrotik_sync_push_pull_pppoe_passwords(client, admin_token, db_session, monkeypatch):
    plan = Plan(name="Sync Plan", bandwidth_mbps=50, price=Decimal("20.00"), currency="USD")
    db_session.add(plan)
    db_session.flush()

    user_1 = User(
        email="sync1@example.com",
        username="syncuser1",
        hashed_password=get_password_hash("secret1"),
        is_active=True,
        is_superuser=False,
    )
    user_2 = User(
        email="sync2@example.com",
        username="syncuser2",
        hashed_password=get_password_hash("secret2"),
        is_active=True,
        is_superuser=False,
    )
    db_session.add_all([user_1, user_2])
    db_session.flush()

    client_1 = Client(
        user_id=user_1.id,
        plan_id=plan.id,
        pppoe_username="alice",
        pppoe_password="alice-app-pass",
        ip_address="192.168.10.10",
        mac_address="AA:AA:AA:AA:AA:01",
    )
    client_2 = Client(
        user_id=user_2.id,
        plan_id=plan.id,
        pppoe_username="bob",
        pppoe_password="bob-app-pass",
        ip_address="192.168.10.11",
        mac_address="AA:AA:AA:AA:AA:02",
    )
    db_session.add_all([client_1, client_2])
    db_session.commit()

    create_server = client.post(
        "/api/mikrotik-servers/",
        json={
            "server_name": "SYNC-MT",
            "server_ip": "10.2.2.2",
            "username": "admin",
            "password": "pass123",
            "api_port": 8728,
            "mikrotik_version": "v3",
            "request_timeout_sec": 10,
            "is_active": True,
        },
        headers=auth_headers(admin_token),
    )
    assert create_server.status_code == 201
    server_id = create_server.json()["id"]

    class FakeSecretResource:
        def __init__(self):
            self.records = [
                {".id": "*1", "name": "alice", "password": "alice-router-pass"},
                {".id": "*2", "name": "router_only", "password": "only-router-pass"},
            ]
            self.added = []
            self.updated = []

        def get(self):
            return self.records

        def add(self, **kwargs):
            self.added.append(kwargs)

        def set(self, **kwargs):
            self.updated.append(kwargs)
            record_id = kwargs.get("id")
            new_password = kwargs.get("password")
            for item in self.records:
                if item.get(".id") == record_id and new_password is not None:
                    item["password"] = new_password
                    break

    class FakeApi:
        def __init__(self, resource):
            self.resource = resource

        def get_resource(self, _path):
            return self.resource

    class FakePool:
        def __init__(self, *_args, **_kwargs):
            self.resource = FakeSecretResource()
            self.disconnected = False

        def get_api(self):
            return FakeApi(self.resource)

        def disconnect(self):
            self.disconnected = True

    fake_pool_holder = {}

    def fake_pool_factory(*args, **kwargs):
        pool = FakePool(*args, **kwargs)
        fake_pool_holder["pool"] = pool
        return pool

    monkeypatch.setattr("app.api.routes.mikrotik_servers.routeros_api.RouterOsApiPool", fake_pool_factory)

    sync = client.post(f"/api/mikrotik-servers/{server_id}/sync", headers=auth_headers(admin_token))
    assert sync.status_code == 200
    sync_payload = sync.json()

    assert sync_payload["status"] == "ok"
    assert sync_payload["pushed_created"] == 1
    assert sync_payload["pushed_updated"] == 1
    assert sync_payload["pulled_updated"] == 0
    assert sync_payload["skipped_router_only"] == 1

    pool = fake_pool_holder["pool"]
    assert pool.disconnected is True
    assert pool.resource.added == [{"name": "bob", "password": "bob-app-pass", "service": "pppoe"}]

    db_session.refresh(client_1)
    db_session.refresh(client_2)
    assert client_1.pppoe_password == "alice-app-pass"
    assert client_2.pppoe_password == "bob-app-pass"


def test_import_from_mikrotik_preview_update_commit(client, admin_token, db_session, monkeypatch):
    plan = Plan(name="Import Plan", bandwidth_mbps=20, price=Decimal("15.00"), currency="USD")
    db_session.add(plan)
    db_session.commit()

    create_server = client.post(
        "/api/mikrotik-servers/",
        json={
            "server_name": "IMPORT-MT",
            "server_ip": "10.5.5.5",
            "username": "admin",
            "password": "pass123",
            "api_port": 8728,
            "mikrotik_version": "v3",
            "request_timeout_sec": 10,
            "is_active": True,
        },
        headers=auth_headers(admin_token),
    )
    assert create_server.status_code == 201
    server_id = create_server.json()["id"]

    class FakeResource:
        def __init__(self, dataset):
            self.dataset = dataset

        def get(self, **filters):
            if not filters:
                return self.dataset
            result = []
            for item in self.dataset:
                ok = True
                for key, value in filters.items():
                    if str(item.get(key, "")) != str(value):
                        ok = False
                        break
                if ok:
                    result.append(item)
            return result

        def set(self, **kwargs):
            row_id = kwargs.get("id")
            for item in self.dataset:
                if item.get(".id") == row_id:
                    for key, value in kwargs.items():
                        if key != "id":
                            item[key] = value
                    return

    class FakeApi:
        def __init__(self):
            self.secrets = [
                {
                    ".id": "*1",
                    "name": "R3545001",
                    "password": "pass-1",
                    "profile": "User-VIP",
                    "disabled": "false",
                    "comment": "Sofiulla 01875764029",
                }
            ]
            self.profiles = [{".id": "*p1", "name": "User-VIP"}]

        def get_resource(self, path):
            if path == "/ppp/secret":
                return FakeResource(self.secrets)
            if path == "/ppp/profile":
                return FakeResource(self.profiles)
            raise AssertionError(path)

    class FakePool:
        def __init__(self, *_args, **_kwargs):
            self.api = FakeApi()

        def get_api(self):
            return self.api

        def disconnect(self):
            return None

    monkeypatch.setattr("app.api.routes.mikrotik_servers.routeros_api.RouterOsApiPool", FakePool)

    options = client.get(
        f"/api/mikrotik-servers/import-from-mikrotik/options?router_id={server_id}",
        headers=auth_headers(admin_token),
    )
    assert options.status_code == 200
    assert options.json()["profiles"] == ["User-VIP"]

    preview = client.post(
        "/api/mikrotik-servers/import-from-mikrotik/preview",
        json={
            "router_id": server_id,
            "profile": "User-VIP",
            "import_client_name": True,
            "import_mobile": True,
            "import_status": True,
            "import_package_and_bill": True,
            "import_pppoe_passwords": True,
        },
        headers=auth_headers(admin_token),
    )
    assert preview.status_code == 200
    rows = preview.json()["rows"]
    assert len(rows) == 1
    assert rows[0]["pppoe_id"] == "R3545001"

    update_row = client.post(
        "/api/mikrotik-servers/import-from-mikrotik/update-row",
        json={
            "router_id": server_id,
            "pppoe_id": "R3545001",
            "client": "Sofiulla",
            "mobile": "01875764029",
            "profile": "User-VIP",
            "status": "active",
            "password": "pass-1-updated",
        },
        headers=auth_headers(admin_token),
    )
    assert update_row.status_code == 200
    assert update_row.json()["password"] == "pass-1-updated"

    commit = client.post(
        "/api/mikrotik-servers/import-from-mikrotik/commit",
        json={
            "router_id": server_id,
            "selected_rows": [
                {
                    "pppoe_id": "R3545001",
                    "password": "pass-1-updated",
                    "client": "Sofiulla",
                    "mobile": "01875764029",
                    "profile": "User-VIP",
                    "package": "Import Plan",
                    "price": 15,
                    "status": "active",
                }
            ],
        },
        headers=auth_headers(admin_token),
    )
    assert commit.status_code == 200
    assert commit.json()["imported"] == 1


def test_add_new_client_options_and_create(client, admin_token, db_session, monkeypatch):
    plan = Plan(name="Starter-AddNew", bandwidth_mbps=30, price=Decimal("20.00"), currency="USD")
    db_session.add(plan)
    mt = NetworkDevice(
        name="Test-MT",
        device_type=DeviceType.mikrotik,
        ip_address="10.9.9.9",
        api_username="admin",
        api_password="pass123",
        api_port=8728,
        is_active=True,
    )
    db_session.add(mt)
    db_session.commit()

    class FakeSecretResource:
        def __init__(self):
            self.items = []

        def get(self, **filters):
            if "name" not in filters:
                return self.items
            return [item for item in self.items if item.get("name") == filters["name"]]

        def add(self, **kwargs):
            rec = {".id": "*1", **kwargs}
            self.items.append(rec)

        def set(self, **kwargs):
            return None

    class FakeApi:
        def __init__(self):
            self.secret = FakeSecretResource()

        def get_resource(self, path):
            assert path == "/ppp/secret"
            return self.secret

    class FakePool:
        def __init__(self, *_args, **_kwargs):
            self.api = FakeApi()

        def get_api(self):
            return self.api

        def disconnect(self):
            return None

    monkeypatch.setattr("app.api.routes.clients.routeros_api.RouterOsApiPool", FakePool)

    options = client.get("/api/clients/add-new/options", headers=auth_headers(admin_token))
    assert options.status_code == 200
    assert len(options.json()["packages"]) >= 1
    assert len(options.json()["servers"]) >= 1

    create = client.post(
        "/api/clients/add-new",
        json={
            "server_id": mt.id,
            "customer_name": "Mahabob",
            "username": "newclient01",
            "password": "client-pass",
            "package_id": plan.id,
            "mobile_number": "01712345678",
            "billing_status": "active",
            "client_type": "home",
            "monthly_bill": 20,
        },
        headers=auth_headers(admin_token),
    )
    assert create.status_code == 201
    payload = create.json()
    assert payload["customer_name"] == "Mahabob"
    assert payload["username"] == "newclient01"

    created_user = db_session.query(User).filter(User.username == "newclient01").first()
    assert created_user is not None

    created_client = db_session.query(Client).filter(Client.user_id == created_user.id).first()
    assert created_client is not None
    assert created_client.pppoe_username == "newclient01"


def test_add_new_client_server_profiles_and_username_check(client, admin_token, db_session, monkeypatch):
    mt = NetworkDevice(
        name="Profile-MT",
        device_type=DeviceType.mikrotik,
        ip_address="10.10.10.10",
        api_username="admin",
        api_password="pass123",
        api_port=8728,
        is_active=True,
    )
    db_session.add(mt)
    db_session.commit()

    class FakeProfileResource:
        def get(self):
            return [{"name": "Basic-5M"}, {"name": "Premium-10M"}]

    class FakeSecretResource:
        def get(self, **kwargs):
            name = kwargs.get("name")
            if name == "existinguser":
                return [{"name": "existinguser"}]
            return []

    class FakeApi:
        def get_resource(self, path):
            if path == "/ppp/profile":
                return FakeProfileResource()
            if path == "/ppp/secret":
                return FakeSecretResource()
            raise AssertionError(path)

    class FakePool:
        def __init__(self, *_args, **_kwargs):
            self.api = FakeApi()

        def get_api(self):
            return self.api

        def disconnect(self):
            return None

    monkeypatch.setattr("app.api.routes.clients.routeros_api.RouterOsApiPool", FakePool)

    profiles = client.get(f"/api/clients/add-new/server-profiles?server_id={mt.id}", headers=auth_headers(admin_token))
    assert profiles.status_code == 200
    assert profiles.json()["profiles"] == ["Basic-5M", "Premium-10M"]

    check_existing = client.get(
        f"/api/clients/add-new/username-check?server_id={mt.id}&username=existinguser",
        headers=auth_headers(admin_token),
    )
    assert check_existing.status_code == 200
    assert check_existing.json()["available"] is False

    check_new = client.get(
        f"/api/clients/add-new/username-check?server_id={mt.id}&username=newuser",
        headers=auth_headers(admin_token),
    )
    assert check_new.status_code == 200
    assert check_new.json()["available"] is True


def test_client_list_view_and_monitor_toggle(client, admin_token, db_session):
    plan = Plan(name="ListViewPlan", bandwidth_mbps=15, price=Decimal("12.00"), currency="USD")
    db_session.add(plan)
    db_session.flush()

    user = User(
        email="listview@example.com",
        username="listuser",
        hashed_password=get_password_hash("secret"),
        is_active=True,
        is_superuser=False,
    )
    db_session.add(user)
    db_session.flush()

    client_row = Client(
        user_id=user.id,
        plan_id=plan.id,
        pppoe_username="R11111",
        pppoe_password="pass111",
        ip_address="10.0.0.10",
        mac_address="AA:BB:CC:DD:EE:11",
    )
    db_session.add(client_row)
    db_session.commit()

    listing = client.get("/api/clients/list-view", headers=auth_headers(admin_token))
    assert listing.status_code == 200
    payload = listing.json()
    assert "stats" in payload
    assert "options" in payload
    assert "items" in payload
    assert any(item["id_or_ip"] == "R11111" for item in payload["items"])

    toggle = client.patch(
        f"/api/clients/{client_row.id}/monitor-status",
        json={"enabled": False},
        headers=auth_headers(admin_token),
    )
    assert toggle.status_code == 200
    assert toggle.json()["monitoring_status"] is False


def test_add_new_client_upload_endpoint(client, admin_token):
    upload = client.post(
        "/api/clients/add-new/upload?kind=profile",
        files={"file": ("avatar.png", b"fake-image-content", "image/png")},
        headers=auth_headers(admin_token),
    )
    assert upload.status_code == 200
    payload = upload.json()
    assert payload["kind"] == "profile"
    assert payload["file_path"].startswith("/uploads/client-onboarding/profile_")
