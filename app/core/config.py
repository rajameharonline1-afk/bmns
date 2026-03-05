from __future__ import annotations

from urllib.parse import quote_plus

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "BMNS"

    mysql_host: str = "172.16.3.10"
    mysql_port: int = 3306
    mysql_db: str = "bmns_db"
    mysql_user: str = "bmns_user"
    mysql_password: str = "bmns!010230"

    redis_url: str = "redis://127.0.0.1:6379/0"

    jwt_secret_key: str = "CHANGE_ME"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_minutes: int = 60 * 24 * 7

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_url(self) -> str:
        password = quote_plus(self.mysql_password)
        return (
            f"mysql+pymysql://{self.mysql_user}:{password}@"
            f"{self.mysql_host}:{self.mysql_port}/{self.mysql_db}"
        )


settings = Settings()
