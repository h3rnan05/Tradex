from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./tradex.db"
    supabase_url: str = ""
    supabase_key: str = ""
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    eodhd_api_key: str = ""
    # Comma-separated or JSON list of extra allowed CORS origins.
    # Any *.vercel.app origin is allowed automatically (see main.py), so this
    # is only needed for custom domains. Stored as a plain string so a slightly
    # malformed value can never crash app startup.
    allowed_origins: str = "http://localhost:3000"
    resend_api_key: str = ""
    frontend_url: str = "http://localhost:3000"
    reset_token_expire_minutes: int = 60

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse allowed_origins from JSON-array or comma-separated form.

        Never raises — a bad value simply yields fewer origins instead of
        crashing the whole service at startup.
        """
        raw = (self.allowed_origins or "").strip()
        if not raw:
            return []
        if raw.startswith("["):
            import json
            try:
                return [str(o).strip() for o in json.loads(raw) if str(o).strip()]
            except Exception:
                pass
        return [o.strip() for o in raw.split(",") if o.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
