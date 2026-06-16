from decimal import Decimal

from pydantic import BaseModel

from schemas.orden import OrdenOut


class ActivoPlantilla(BaseModel):
    ticker: str
    porcentaje: Decimal


class PlantillaPortafolioOut(BaseModel):
    perfil_riesgo: str
    nombre: str
    descripcion: str
    activos: list[ActivoPlantilla]


class AplicarPlantillaRequest(BaseModel):
    perfil_riesgo: str


class AplicarPlantillaResponse(BaseModel):
    ordenes: list[OrdenOut]
    advertencias: list[str]
