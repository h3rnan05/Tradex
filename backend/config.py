from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./tradex.db"
    supabase_url: str = ""
    supabase_key: str = ""
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    eodhd_api_key: str = ""
    allowed_origins: list[str] = ["http://localhost:3000"]
    resend_api_key: str = ""
    frontend_url: str = "http://localhost:3000"
    reset_token_expire_minutes: int = 60

    class Config:
        env_file = ".env"


settings = Settings()
