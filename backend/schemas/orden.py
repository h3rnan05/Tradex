import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from models.orden import TipoOrdenEnum


class OrdenCreate(BaseModel):
    grupo_id: uuid.UUID
    ticker: str
    cantidad: Decimal
    # Multiplicador de apalancamiento (1x–5x). 1 = sin apalancamiento.
    apalancamiento: Decimal = Decimal("1")


class OrdenOut(BaseModel):
    id: uuid.UUID
    alumno_id: uuid.UUID
    grupo_id: uuid.UUID
    ticker: str
    tipo: TipoOrdenEnum
    cantidad: Decimal
    precio_ejecucion: Decimal
    comision: Decimal
    timestamp: datetime

    class Config:
        from_attributes = True
