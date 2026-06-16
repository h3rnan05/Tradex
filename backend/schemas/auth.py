import uuid

from pydantic import BaseModel, EmailStr

from models.user import RolEnum


class RegisterRequest(BaseModel):
    email: EmailStr
    nombre: str
    password: str
    rol: RolEnum


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: uuid.UUID
    nombre: str
    rol: RolEnum
