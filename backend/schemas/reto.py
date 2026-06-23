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
    pausado: bool = False

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
    # Multiplicador de apalancamiento (1x–5x). 1 = sin apalancamiento.
    apalancamiento: Decimal = Decimal("1")


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
    prestamo: Decimal = Decimal("0")
    apalancamiento: Decimal = Decimal("1")


class RetoEstadoOut(BaseModel):
    reto: RetoOut
    capital_disponible: Decimal
    holdings: list[RetoHoldingOut]
    valor_total: Decimal
    rendimiento_porcentaje: Decimal
    progreso_porcentaje: float
    prestamo_total: Decimal = Decimal("0")


class RetoMercadoEntry(BaseModel):
    ticker: str
    precio: Decimal
    cambio_porcentaje: float
    cambio_total: float = 0.0


class RetoNoticia(BaseModel):
    fecha: str
    titular: str
    cuerpo: str


class RetoNoticiasOut(BaseModel):
    periodico: str
    noticias: list[RetoNoticia]


class RetoRankingEntry(BaseModel):
    alumno_id: uuid.UUID
    nombre: str
    valor_total: Decimal
    rendimiento_porcentaje: Decimal


class RetoParticipanteResumen(BaseModel):
    alumno_id: uuid.UUID
    nombre: str
    capital_disponible: Decimal
    valor_total: Decimal
    n_operaciones: int
    pnl_pct: Decimal


class RetoAdivinanzaCreate(BaseModel):
    decada: str | None = None
    pais: str | None = None
    causa: str | None = None


class RetoAdivinanzaOut(BaseModel):
    fase_actual: int          # 0=decada 1=pais 2=causa 3=descripcion -1=no aplica
    decada_guess: str | None
    pais_guess: str | None
    causa_guess: str | None
    puntos: int | None
    descripcion: str | None   # solo visible en fase 3+

    class Config:
        from_attributes = True


class RetoPreguntaFaseOut(BaseModel):
    fase_actual: int
    opciones: list[str]       # opciones disponibles para esta fase
    descripcion: str | None   # descripcion del escenario (solo en fase 3)
