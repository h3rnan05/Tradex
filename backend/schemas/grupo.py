import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from schemas.membership import MembershipOut
from schemas.holding import HoldingOut
from schemas.orden import OrdenOut


class GrupoCreate(BaseModel):
    nombre: str
    fecha_inicio: datetime
    fecha_fin: datetime
    capital_inicial: Decimal


class GrupoOut(BaseModel):
    id: uuid.UUID
    nombre: str
    maestro_id: uuid.UUID
    fecha_inicio: datetime
    fecha_fin: datetime
    capital_inicial: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


class GrupoDetalle(GrupoOut):
    memberships: list[MembershipOut] = []
    holdings: list[HoldingOut] = []
    ordenes: list[OrdenOut] = []


class InvitarRequest(BaseModel):
    alumno_email: str
