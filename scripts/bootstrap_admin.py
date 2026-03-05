import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.role import Role
from app.models.user import User


def bootstrap_admin() -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin").first()
        admin_role = db.query(Role).filter(Role.name == "admin").first()

        if not admin_role:
            admin_role = Role(name="admin")
            db.add(admin_role)
            db.flush()

        if not user:
            user = User(
                email="admin@bmns.local",
                username="admin",
                hashed_password=get_password_hash("1234"),
                is_active=True,
                is_superuser=True,
                roles=[admin_role],
            )
            db.add(user)
            db.commit()
            print("Created default admin user: admin / 1234")
            return

        user.hashed_password = get_password_hash("1234")
        user.is_active = True
        user.is_superuser = True
        if admin_role not in user.roles:
            user.roles.append(admin_role)
        db.commit()
        print("Updated existing admin user password to: 1234")
    finally:
        db.close()


if __name__ == "__main__":
    bootstrap_admin()
