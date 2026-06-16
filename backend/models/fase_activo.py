import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


class FaseActivo(Base):
    __tablename__ = "fases_activo"
    __table_args__ = (UniqueConstraint("grupo_id", "tipo_activo", name="uq_grupo_tipo_activo"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grupo_id = Column(UUID(as_uuid=True), ForeignKey("grupos.id"), nullable=False)
    tipo_activo = Column(String, nullable=False)
    fecha_activacion = Column(DateTime(timezone=True), nullable=False)

    grupo = relationship("Grupo", back_populates="fases_activo")
