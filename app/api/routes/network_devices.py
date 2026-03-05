from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.deps import require_roles
from app.models.network_device import NetworkDevice
from app.schemas.network_device import NetworkDeviceCreate, NetworkDeviceRead, NetworkDeviceUpdate

router = APIRouter()


def get_device(db: Session, device_id: int) -> NetworkDevice:
    device = db.query(NetworkDevice).filter(NetworkDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network device not found")
    return device


@router.post("/", response_model=NetworkDeviceRead, status_code=status.HTTP_201_CREATED)
def create_device(
    payload: NetworkDeviceCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> NetworkDevice:
    device = NetworkDevice(**payload.model_dump())
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.get("/", response_model=list[NetworkDeviceRead])
def list_devices(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> list[NetworkDevice]:
    return db.query(NetworkDevice).order_by(NetworkDevice.id).all()


@router.get("/{device_id}", response_model=NetworkDeviceRead)
def read_device(
    device_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee")),
) -> NetworkDevice:
    return get_device(db, device_id)


@router.put("/{device_id}", response_model=NetworkDeviceRead)
def update_device(
    device_id: int,
    payload: NetworkDeviceUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> NetworkDevice:
    device = get_device(db, device_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(device, field, value)
    db.commit()
    db.refresh(device)
    return device


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(
    device_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin")),
) -> None:
    device = get_device(db, device_id)
    db.delete(device)
    db.commit()
