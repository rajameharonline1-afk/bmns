from decimal import Decimal

from app.schemas.base import APIModel


class PlanBase(APIModel):
    name: str
    bandwidth_mbps: int
    price: Decimal
    currency: str = "USD"


class PlanCreate(PlanBase):
    pass


class PlanUpdate(APIModel):
    name: str | None = None
    bandwidth_mbps: int | None = None
    price: Decimal | None = None
    currency: str | None = None


class PlanRead(PlanBase):
    id: int
