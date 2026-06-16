import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class TipoOrdenEnum(str, enum.Enum):
    compra = "compra"
    venta = "venta"


class Orden(Base):
    __tablename__ = "ordenes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    grupo_id = Column(UUID(as_uuid=True), ForeignKey("grupos.id"), nullable=False)
    ticker = Column(String, nullable=False)
    tipo = Column(Enum(TipoOrdenEnum), nullable=False)
    cantidad = Column(Numeric(14, 4), nullable=False)
    precio_ejecucion = Column(Numeric(14, 4), nullable=False)
    comision = Column(Numeric(14, 4), nullable=False, server_default="0")
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
