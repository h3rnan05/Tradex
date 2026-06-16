import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from models.reto import TipoOrdenRetoEnum


class RetoCreate(BaseModel):
    escenario_id: str
    nombre: str
    fecha_inicio: datetime
    fecha_fin: datetime
    capital_inicial: Decimal


class RetoOut(BaseModel):
    id: uuid.UUID
    grupo_id: uuid.UUID
    escenario_id: str
    nombre: str
    fecha_inicio: datetime
    fecha_fin: datetime
    capital_inicial: Decimal

    class Config:
        from_attributes = True


class RetoOrdenCreate(BaseModel):
    ticker: str
    cantidad: Decimal


class RetoOrdenOut(BaseModel):
    id: uuid.UUID
    reto_id: uuid.UUID
    alumno_id: uuid.UUID
    ticker: str
    tipo: TipoOrdenRetoEnum
    cantidad: Decimal
    precio_ejecucion: Decimal
    timestamp: datetime

    class Config:
        from_attributes = True


class RetoHoldingOut(BaseModel):
    ticker: str
    cantidad: Decimal
    precio_promedio: Decimal
    precio_actual: Decimal
    valor_mercado: Decimal


class RetoEstadoOut(BaseModel):
    reto: RetoOut
    capital_disponible: Decimal
    holdings: list[RetoHoldingOut]
    valor_total: Decimal
    rendimiento_porcentaje: Decimal
    progreso_porcentaje: float


class RetoRankingEntry(BaseModel):
    alumno_id: uuid.UUID
    nombre: str
    valor_total: Decimal
    rendimiento_porcentaje: Decimal
