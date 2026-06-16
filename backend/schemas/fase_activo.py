import uuid
from datetime import datetime

from pydantic import BaseModel


class FaseActivoCreate(BaseModel):
    tipo_activo: str
    fecha_activacion: datetime


class FaseActivoOut(BaseModel):
    id: uuid.UUID
    tipo_activo: str
    fecha_activacion: datetime

    class Config:
        from_attributes = True
