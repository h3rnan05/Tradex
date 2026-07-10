import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class EstadoOrdenEnum(str, enum.Enum):
    pendiente = "pendiente"
    ejecutada = "ejecutada"
    cancelada = "cancelada"
    fallida = "fallida"


class OrdenPendiente(Base):
    __tablename__ = "ordenes_pendientes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    grupo_id = Column(UUID(as_uuid=True), ForeignKey("grupos.id"), nullable=False)
    ticker = Column(String, nullable=False)
    tipo = Column(String, nullable=False)  # compra / venta
    cantidad = Column(Numeric(14, 4), nullable=False)
    precio_limite = Column(Numeric(14, 4), nullable=False)
    estado = Column(Enum(EstadoOrdenEnum), nullable=False, default=EstadoOrdenEnum.pendiente)
    creada_en = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ejecutada_en = Column(DateTime(timezone=True), nullable=True)
    sl_tp_tipo = Column(String, nullable=True)   # "stop_loss" | "take_profit"
    precio_trigger = Column(Numeric(14, 4), nullable=True)
