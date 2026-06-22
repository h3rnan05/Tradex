import uuid

from sqlalchemy import Boolean, Column, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class Holding(Base):
    __tablename__ = "holdings"
    __table_args__ = (
        UniqueConstraint("alumno_id", "grupo_id", "ticker", "es_corto", name="uq_holding_alumno_grupo_ticker_tipo"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    grupo_id = Column(UUID(as_uuid=True), ForeignKey("grupos.id"), nullable=False)
    ticker = Column(String, nullable=False)
    cantidad = Column(Numeric(14, 4), nullable=False, default=0)
    precio_promedio = Column(Numeric(14, 4), nullable=False, default=0)
    es_corto = Column(Boolean, nullable=False, server_default="false", default=False)
    # Porción financiada de la posición apalancada: efectivo prestado (largos) o
    # colateral comprometido (cortos). 0 = posición sin apalancamiento (1x).
    prestamo = Column(Numeric(14, 2), nullable=False, server_default="0", default=0)
