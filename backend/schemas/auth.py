import uuid

from pydantic import BaseModel, EmailStr, Field

from models.user import RolEnum


class RegisterRequest(BaseModel):
    email: EmailStr
    nombre: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)
    codigo_grupo: str | None = Field(None, max_length=6)
    es_maestro: bool = False


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: uuid.UUID
    nombre: str
    rol: RolEnum
    email_verificado: bool = False
