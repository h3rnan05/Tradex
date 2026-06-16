import uuid
from decimal import Decimal

from pydantic import BaseModel


class RankingEntry(BaseModel):
    alumno_id: uuid.UUID
    nombre: str
    valor_total: Decimal
    rendimiento: Decimal
    rendimiento_porcentaje: Decimal
