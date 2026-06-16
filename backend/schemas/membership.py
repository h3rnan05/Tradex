import uuid
from decimal import Decimal

from pydantic import BaseModel


class MembershipOut(BaseModel):
    id: uuid.UUID
    grupo_id: uuid.UUID
    alumno_id: uuid.UUID
    capital_disponible: Decimal

    class Config:
        from_attributes = True
