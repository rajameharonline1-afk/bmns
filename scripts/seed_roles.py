from app.db.session import SessionLocal
from app.models.role import Role

ROLE_NAMES = [
    "admin",
    "manager",
    "employee",
    "reseller",
    "client",
]


def seed_roles() -> None:
    db = SessionLocal()
    try:
        existing = {role.name for role in db.query(Role).all()}
        to_create = [Role(name=name) for name in ROLE_NAMES if name not in existing]
        if to_create:
            db.add_all(to_create)
            db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_roles()
