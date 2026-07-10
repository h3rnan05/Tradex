import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, String
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class RolEnum(str, enum.Enum):
    maestro = "maestro"
    alumno = "alumno"
    admin = "admin"
    sponsor = "sponsor"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    nombre = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    rol = Column(Enum(RolEnum), nullable=False)
    escuela = Column(String, nullable=True)
    ciudad = Column(String, nullable=True)
    estado = Column(String, nullable=True)
    suspendido = Column(Boolean, nullable=False, server_default="false", default=False)
    email_verificado = Column(Boolean, nullable=False, server_default="false", default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
