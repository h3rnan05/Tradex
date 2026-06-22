import random
import string
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import relationship

from database import Base


def _generar_codigo() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


class Grupo(Base):
    __tablename__ = "grupos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String, nullable=False)
    codigo = Column(String(6), unique=True, nullable=True, index=True)
    maestro_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    fecha_inicio = Column(DateTime(timezone=True), nullable=False)
    fecha_fin = Column(DateTime(timezone=True), nullable=False)
    capital_inicial = Column(Numeric(14, 2), nullable=False)
    max_alumnos = Column(Integer, nullable=True)
    activos_permitidos = Column(ARRAY(String), nullable=False, server_default="{acciones}")
    limite_orden_valor = Column(Numeric(14, 2), nullable=True)
    comision_porcentaje = Column(Numeric(5, 4), nullable=False, server_default="0")
    max_apalancamiento = Column(Integer, nullable=False, server_default="5")
    sponsor_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    maestro = relationship("User")
    memberships = relationship("Membership", back_populates="grupo", cascade="all, delete-orphan")
    fases_activo = relationship("FaseActivo", back_populates="grupo", cascade="all, delete-orphan")
