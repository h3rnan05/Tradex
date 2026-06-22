import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class HoldingOut(BaseModel):
    id: uuid.UUID
    alumno_id: uuid.UUID
    grupo_id: uuid.UUID
    ticker: str
    cantidad: Decimal
    precio_promedio: Decimal
    es_corto: bool = False

    class Config:
        from_attributes = True


class HoldingConPrecio(HoldingOut):
    precio_actual: Decimal
    valor_mercado: Decimal
    pnl: Decimal
    pnl_porcentaje: Decimal
    prestamo: Decimal = Decimal("0")
    apalancamiento: Decimal = Decimal("1")


class PortafolioOut(BaseModel):
    grupo_id: uuid.UUID
    capital_disponible: Decimal
    capital_inicial: Decimal
    holdings: list[HoldingConPrecio]
    valor_total: Decimal
    rendimiento: Decimal
    rendimiento_porcentaje: Decimal
    prestamo_total: Decimal = Decimal("0")
    activos_disponibles: list[str] = []
    activos_proximos: list[dict] = []


class MisGruposEntry(BaseModel):
    grupo_id: uuid.UUID
    nombre: str
    codigo: Optional[str] = None
    fecha_inicio: datetime
    fecha_fin: datetime
    capital_inicial: Decimal
    capital_disponible: Decimal
    valor_total: Decimal
    pausado: bool
    activos_permitidos: list[str]

    class Config:
        from_attributes = True
