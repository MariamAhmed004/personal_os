from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Personal OS API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://personal_os:change-me@localhost:5432/personal_os"
    secret_key: str = Field(
        default="development-only-change-me-change-before-deployment",
        min_length=32,
    )
    access_token_expire_minutes: int = 30
    ollama_url: str = "http://host.docker.internal:11434"
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
