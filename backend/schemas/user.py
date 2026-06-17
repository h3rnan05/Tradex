import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr

from models.user import RolEnum


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    nombre: str
    rol: RolEnum
    escuela: str | None = None
    ciudad: str | None = None
    estado: str | None = None
    suspendido: bool = False
    created_at: datetime

    class Config:
        from_attributes = True
