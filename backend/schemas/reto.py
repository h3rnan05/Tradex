import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, field_validator

from models.reto import TipoOrdenRetoEnum


class RetoCreate(BaseModel):
    nombre: str
    fecha_inicio: datetime
    fecha_fin: datetime
    capital_inicial: Decimal
    # Uno de los dos: escenario histórico o lista de activos en vivo.
    escenario_id: str | None = None
    activos_permitidos: list[str] | None = None


class RetoOut(BaseModel):
    id: uuid.UUID
    grupo_id: uuid.UUID
    escenario_id: str | None = None
    activos_permitidos: list[str] | None = None
    nombre: str
    fecha_inicio: datetime
    fecha_fin: datetime
    capital_inicial: Decimal

    class Config:
        from_attributes = True

    @field_validator("activos_permitidos", mode="before")
    @classmethod
    def _split_activos(cls, v):
        # En la BD se guarda como string separado por comas.
        if isinstance(v, str):
            return [t for t in (x.strip() for x in v.split(",")) if t]
        return v


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


class RetoMercadoEntry(BaseModel):
    ticker: str
    precio: Decimal
    cambio_porcentaje: float
    cambio_total: float = 0.0


class RetoRankingEntry(BaseModel):
    alumno_id: uuid.UUID
    nombre: str
    valor_total: Decimal
    rendimiento_porcentaje: Decimal
