import argparse

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.role import Role
from app.models.user import User


def create_superuser(email: str, username: str, password: str) -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter((User.email == email) | (User.username == username)).first()
        if existing:
            raise SystemExit("User already exists")

        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            admin_role = Role(name="admin")
            db.add(admin_role)
            db.flush()

        user = User(
            email=email,
            username=username,
            hashed_password=get_password_hash(password),
            is_active=True,
            is_superuser=True,
            roles=[admin_role],
        )
        db.add(user)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a BMNS superuser")
    parser.add_argument("--email", required=True)
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    create_superuser(args.email, args.username, args.password)
