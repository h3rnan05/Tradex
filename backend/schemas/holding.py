import uuid
from decimal import Decimal

from pydantic import BaseModel


class HoldingOut(BaseModel):
    id: uuid.UUID
    alumno_id: uuid.UUID
    grupo_id: uuid.UUID
    ticker: str
    cantidad: Decimal
    precio_promedio: Decimal

    class Config:
        from_attributes = True


class HoldingConPrecio(HoldingOut):
    precio_actual: Decimal
    valor_mercado: Decimal
    pnl: Decimal
    pnl_porcentaje: Decimal


class PortafolioOut(BaseModel):
    grupo_id: uuid.UUID
    capital_disponible: Decimal
    capital_inicial: Decimal
    holdings: list[HoldingConPrecio]
    valor_total: Decimal
    rendimiento: Decimal
    rendimiento_porcentaje: Decimal
