import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


class TipoOrdenRetoEnum(str, enum.Enum):
    compra = "compra"
    venta = "venta"


class Reto(Base):
    __tablename__ = "retos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grupo_id = Column(UUID(as_uuid=True), ForeignKey("grupos.id"), nullable=False)
    # Modo escenario histórico (precio_simulado) — opcional.
    escenario_id = Column(String, nullable=True)
    # Modo activos en vivo: tickers permitidos separados por coma. Si está
    # presente, el reto usa precios reales y restringe a estos activos.
    activos_permitidos = Column(String, nullable=True)
    nombre = Column(String, nullable=False)
    fecha_inicio = Column(DateTime(timezone=True), nullable=False)
    fecha_fin = Column(DateTime(timezone=True), nullable=False)
    capital_inicial = Column(Numeric(14, 2), nullable=False)
    pausado = Column(Boolean, nullable=False, server_default="false", default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    grupo = relationship("Grupo")
    participantes = relationship("RetoParticipante", back_populates="reto", cascade="all, delete-orphan")


class RetoParticipante(Base):
    __tablename__ = "reto_participantes"
    __table_args__ = (UniqueConstraint("reto_id", "alumno_id", name="uq_reto_alumno"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reto_id = Column(UUID(as_uuid=True), ForeignKey("retos.id"), nullable=False)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    capital_disponible = Column(Numeric(14, 2), nullable=False)

    reto = relationship("Reto", back_populates="participantes")
    alumno = relationship("User")


class RetoHolding(Base):
    __tablename__ = "reto_holdings"
    __table_args__ = (
        UniqueConstraint("reto_id", "alumno_id", "ticker", name="uq_reto_holding_alumno_ticker"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reto_id = Column(UUID(as_uuid=True), ForeignKey("retos.id"), nullable=False)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    ticker = Column(String, nullable=False)
    cantidad = Column(Numeric(14, 4), nullable=False, default=0)
    precio_promedio = Column(Numeric(14, 4), nullable=False, default=0)
    # Efectivo prestado para la parte apalancada de las posiciones largas.
    # 0 = posición sin apalancamiento (1x). Los cortos del reto usan el modelo
    # de ingresos en efectivo (no usan préstamo).
    prestamo = Column(Numeric(14, 2), nullable=False, server_default="0", default=0)


class RetoOrden(Base):
    __tablename__ = "reto_ordenes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reto_id = Column(UUID(as_uuid=True), ForeignKey("retos.id"), nullable=False)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    ticker = Column(String, nullable=False)
    tipo = Column(Enum(TipoOrdenRetoEnum), nullable=False)
    cantidad = Column(Numeric(14, 4), nullable=False)
    precio_ejecucion = Column(Numeric(14, 4), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class RetoAdivinanza(Base):
    __tablename__ = "reto_adivinanzas"
    __table_args__ = (UniqueConstraint("reto_id", "alumno_id", name="uq_reto_adivinanza_alumno"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reto_id = Column(UUID(as_uuid=True), ForeignKey("retos.id"), nullable=False)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    # Respuestas del alumno (None = aún no respondió esa fase)
    decada_guess = Column(String, nullable=True)
    pais_guess = Column(String, nullable=True)
    causa_guess = Column(String, nullable=True)
    # Puntos obtenidos (None = aún no calculados)
    puntos = Column(Numeric(5, 0), nullable=True)
    # True cuando el boost ya fue aplicado al portafolio final
    aplicado = Column(Boolean, nullable=False, server_default="false", default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
