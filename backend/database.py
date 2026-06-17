from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from config import settings

database_url = settings.database_url
# Normalize to the sync psycopg2 driver no matter what format the env var uses.
# Render env vars left over from an async backend may be "postgresql+asyncpg://"
# or "postgres://"; this backend uses the sync driver, so coerce them all.
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)
if "+asyncpg" in database_url:
    database_url = database_url.replace("+asyncpg", "", 1)
if "+psycopg2" in database_url:
    database_url = database_url.replace("+psycopg2", "", 1)

connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
engine = create_engine(database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
