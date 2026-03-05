from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "BMNS"
    database_url: str = "postgresql+psycopg://bmnsisp:1234@localhost:5432/bmns_db"
    jwt_secret_key: str = "CHANGE_ME"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60


settings = Settings()
