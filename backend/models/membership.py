import uuid

from sqlalchemy import Column, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("grupo_id", "alumno_id", name="uq_grupo_alumno"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grupo_id = Column(UUID(as_uuid=True), ForeignKey("grupos.id"), nullable=False)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    capital_disponible = Column(Numeric(14, 2), nullable=False)

    grupo = relationship("Grupo", back_populates="memberships")
    alumno = relationship("User")
