import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from models.orden import TipoOrdenEnum


class OrdenCreate(BaseModel):
    grupo_id: uuid.UUID
    ticker: str
    cantidad: Decimal


class OrdenOut(BaseModel):
    id: uuid.UUID
    alumno_id: uuid.UUID
    grupo_id: uuid.UUID
    ticker: str
    tipo: TipoOrdenEnum
    cantidad: Decimal
    precio_ejecucion: Decimal
    timestamp: datetime

    class Config:
        from_attributes = True
