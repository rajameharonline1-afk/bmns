from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.deps import require_roles
from app.models.plan import Plan
from app.schemas.plan import PlanCreate, PlanRead, PlanUpdate

router = APIRouter()


def get_plan(db: Session, plan_id: int) -> Plan:
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return plan


@router.post("/", response_model=PlanRead, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: PlanCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> Plan:
    plan = Plan(**payload.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/", response_model=list[PlanRead])
def list_plans(
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee", "reseller")),
) -> list[Plan]:
    return db.query(Plan).order_by(Plan.id).all()


@router.get("/{plan_id}", response_model=PlanRead)
def read_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager", "employee", "reseller")),
) -> Plan:
    return get_plan(db, plan_id)


@router.put("/{plan_id}", response_model=PlanRead)
def update_plan(
    plan_id: int,
    payload: PlanUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin", "manager")),
) -> Plan:
    plan = get_plan(db, plan_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_roles("admin")),
) -> None:
    plan = get_plan(db, plan_id)
    db.delete(plan)
    db.commit()
