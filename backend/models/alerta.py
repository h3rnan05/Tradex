import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class Alerta(Base):
    __tablename__ = "alertas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    ticker = Column(String, nullable=False)
    precio_objetivo = Column(Numeric(14, 4), nullable=False)
    condicion = Column(String, nullable=False)  # "gte" (>=) o "lte" (<=)
    activa = Column(Boolean, nullable=False, default=True)
    disparada = Column(Boolean, nullable=False, default=False)
    creada_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    disparada_en = Column(DateTime(timezone=True), nullable=True)
