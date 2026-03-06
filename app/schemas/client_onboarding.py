from datetime import date
from decimal import Decimal

from app.schemas.base import APIModel


class AddNewClientOptionItem(APIModel):
    value: str
    label: str


class AddNewClientOptions(APIModel):
    packages: list[dict]
    servers: list[AddNewClientOptionItem]
    protocol_types: list[AddNewClientOptionItem]
    zones: list[AddNewClientOptionItem]
    sub_zones: list[AddNewClientOptionItem]
    boxes: list[AddNewClientOptionItem]
    connection_types: list[AddNewClientOptionItem]
    client_types: list[AddNewClientOptionItem]
    billing_statuses: list[AddNewClientOptionItem]
    employees: list[AddNewClientOptionItem]
    districts: list[AddNewClientOptionItem]
    upazilas: list[AddNewClientOptionItem]
    references: list[AddNewClientOptionItem]


class AddNewClientCreate(APIModel):
    server_id: int
    client_code: str | None = None
    customer_name: str
    username: str
    password: str
    package_id: int | None = None
    profile: str | None = None
    client_type: str | None = None
    billing_status: str | None = None
    monthly_bill: Decimal | None = None
    billing_starting_from: date | None = None
    expire_date: date | None = None
    owner_name_relation_in_billing: str | None = None
    remarks: str | None = None
    occupation: str | None = None
    nid_or_certificate_no: str | None = None
    registration_perm_no: str | None = None
    father_name: str | None = None
    mother_name: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None
    profile_picture_path: str | None = None
    nid_picture_path: str | None = None
    registration_picture_path: str | None = None
    map_latitude: str | None = None
    map_longitude: str | None = None
    mobile_number: str | None = None
    phone_number: str | None = None
    district: str | None = None
    upazila: str | None = None
    road_no: str | None = None
    house_no: str | None = None
    village_no: str | None = None
    present_address: str | None = None
    permanent_address: str | None = None
    same_as_present_address: bool = False
    email_address: str | None = None
    facebook_url: str | None = None
    linkedin_url: str | None = None
    twitter_url: str | None = None
    serial: str | None = None
    protocol_type: str | None = None
    zone: str | None = None
    sub_zone: str | None = None
    box: str | None = None
    connection_type: str | None = None
    cable_required_meter: str | None = None
    fiber_code: str | None = None
    number_of_core: str | None = None
    core_color: str | None = None
    device: str | None = None
    device_serial_no: str | None = None
    vendor: str | None = None
    purchase_date: date | None = None
    reference_by: str | None = None
    vat_percent_client: str | None = None
    connection_by: str | None = None
    send_greetings_sms: bool = False
    ip_address: str | None = None
    mac_address: str | None = None


class AddNewClientRead(APIModel):
    id: int
    user_id: int
    client_id: int
    client_code: str
    customer_name: str
    username: str


class AddNewClientUploadRead(APIModel):
    file_path: str
    kind: str


class AddNewClientServerProfilesRead(APIModel):
    server_id: int
    profiles: list[str]


class AddNewClientUsernameCheckRead(APIModel):
    available: bool


class AddNewClientCodeSuggestionRead(APIModel):
    client_code: str
