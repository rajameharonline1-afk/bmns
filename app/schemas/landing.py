from app.schemas.base import APIModel


class LandingHomeContent(APIModel):
    brand_name: str
    brand_subtitle: str
    hero_tagline: str
    hero_title: str
    hero_description: str
    primary_cta_label: str
    primary_cta_href: str
    secondary_cta_label: str
    secondary_cta_href: str
    spotlight_title: str
    spotlight_description: str


class LandingMetric(APIModel):
    id: int
    label: str
    value: str


class LandingPlan(APIModel):
    id: int
    name: str
    speed: str
    description: str
    price: str


class LandingPageContent(APIModel):
    home: LandingHomeContent
    metrics: list[LandingMetric]
    plans: list[LandingPlan]
