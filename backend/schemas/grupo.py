import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from schemas.membership import MembershipOut
from schemas.holding import HoldingOut
from schemas.orden import OrdenOut
from schemas.fase_activo import FaseActivoCreate, FaseActivoOut


class GrupoCreate(BaseModel):
    nombre: str
    fecha_inicio: datetime
    fecha_fin: datetime
    capital_inicial: Decimal
    max_alumnos: int | None = None
    activos_permitidos: list[str] = ["acciones"]
    limite_orden_valor: Decimal | None = None
    comision_porcentaje: Decimal = Decimal("0")
    max_apalancamiento: int = 5
    comision_base: int = 1  # 1, 5, or 10
    fases_activo: list[FaseActivoCreate] = []


class GrupoOut(BaseModel):
    id: uuid.UUID
    nombre: str
    maestro_id: uuid.UUID
    fecha_inicio: datetime
    fecha_fin: datetime
    capital_inicial: Decimal
    max_alumnos: int | None
    activos_permitidos: list[str]
    limite_orden_valor: Decimal | None
    comision_porcentaje: Decimal
    max_apalancamiento: int = 5
    comision_base: int = 1  # 1, 5, or 10
    codigo: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class GrupoDetalle(GrupoOut):
    memberships: list[MembershipOut] = []
    holdings: list[HoldingOut] = []
    ordenes: list[OrdenOut] = []
    fases_activo: list[FaseActivoOut] = []


class InvitarRequest(BaseModel):
    alumno_email: str


class GrupoUpdate(BaseModel):
    nombre: str | None = None
    fecha_fin: datetime | None = None
    activos_permitidos: list[str] | None = None
    comision_porcentaje: Decimal | None = None
    limite_orden_valor: Decimal | None = None
    max_alumnos: int | None = None
    max_apalancamiento: int | None = None
    comision_base: int | None = None  # 1, 5, or 10


class EvaluacionEntry(BaseModel):
    alumno_id: uuid.UUID
    nombre: str
    escuela: str | None
    ciudad: str | None
    estado: str | None
    posicion: int
    valor_total: Decimal
    capital_inicial: Decimal
    rendimiento: Decimal
    rendimiento_porcentaje: Decimal
    comisiones_pagadas: Decimal
    num_operaciones: int
    tickers: list[str]
    dias_activo: int
    pausado: bool
