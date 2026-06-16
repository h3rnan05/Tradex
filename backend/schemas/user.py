import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr

from models.user import RolEnum


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    nombre: str
    rol: RolEnum
    created_at: datetime

    class Config:
        from_attributes = True
