import uuid

from sqlalchemy import Column, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class Holding(Base):
    __tablename__ = "holdings"
    __table_args__ = (
        UniqueConstraint("alumno_id", "grupo_id", "ticker", name="uq_holding_alumno_grupo_ticker"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    grupo_id = Column(UUID(as_uuid=True), ForeignKey("grupos.id"), nullable=False)
    ticker = Column(String, nullable=False)
    cantidad = Column(Numeric(14, 4), nullable=False, default=0)
    precio_promedio = Column(Numeric(14, 4), nullable=False, default=0)
