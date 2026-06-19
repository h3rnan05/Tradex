import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from auth_utils import create_access_token, get_current_user, hash_password, verify_password
from database import get_db
from email_utils import send_password_reset_email, send_verification_email, send_welcome_email
from limiter import limiter
from models.password_reset_token import PasswordResetToken
from models.email_verification_token import EmailVerificationToken
from models.grupo import Grupo
from models.membership import Membership
from models.user import RolEnum, User
from schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from schemas.user import UserOut
from config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


def _enviar_verificacion(db: Session, user: User) -> None:
    """Genera un token de verificación de correo y envía el email."""
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == user.id,
        EmailVerificationToken.used == False,
    ).update({"used": True})

    db.add(EmailVerificationToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at))
    db.commit()

    send_verification_email(user.email, user.nombre, raw_token)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    existente = db.query(User).filter(User.email == payload.email).first()
    if existente:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El correo ya esta registrado")

    rol = RolEnum.maestro if payload.es_maestro else RolEnum.alumno

    user = User(
        email=payload.email,
        nombre=payload.nombre,
        hashed_password=hash_password(payload.password),
        rol=rol,
    )
    db.add(user)
    db.flush()

    if payload.codigo_grupo:
        grupo = db.query(Grupo).filter(Grupo.codigo == payload.codigo_grupo.upper().strip()).first()
        if not grupo:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código de grupo inválido")
        if grupo.max_alumnos is not None:
            total = db.query(Membership).filter(Membership.grupo_id == grupo.id).count()
            if total >= grupo.max_alumnos:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El grupo ya alcanzó el límite de {grupo.max_alumnos} alumnos",
                )
        db.add(Membership(grupo_id=grupo.id, alumno_id=user.id, capital_disponible=grupo.capital_inicial))

    db.commit()
    db.refresh(user)

    send_welcome_email(user.email, user.nombre)
    _enviar_verificacion(db, user)

    token = create_access_token(user.id, user.rol)
    return TokenResponse(
        access_token=token, user_id=user.id, nombre=user.nombre,
        rol=user.rol, email_verificado=user.email_verificado,
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")
    if user.suspendido:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta suspendida")

    token = create_access_token(user.id, user.rol)
    return TokenResponse(
        access_token=token, user_id=user.id, nombre=user.nombre,
        rol=user.rol, email_verificado=user.email_verificado,
    )


class VerifyEmailRequest(BaseModel):
    token: str


@router.post("/verify-email", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
def verify_email(request: Request, payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()
    record = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token_hash == token_hash,
        EmailVerificationToken.used == False,
    ).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido o ya utilizado")
    if record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El enlace de verificación expiró")

    user = db.query(User).filter(User.id == record.user_id).first()
    if user:
        user.email_verificado = True
    record.used = True
    db.commit()


@router.post("/resend-verification", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("3/minute")
def resend_verification(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.email_verificado:
        return
    _enviar_verificacion(db, current_user)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("3/minute")
def forgot_password(request: Request, payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    # Always return 204 to prevent email enumeration
    if not user:
        return

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.reset_token_expire_minutes)

    # Invalidate any existing tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False,
    ).update({"used": True})

    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(reset_token)
    db.commit()

    send_password_reset_email(user.email, user.nombre, raw_token)


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
def reset_password(request: Request, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used == False,
    ).first()

    if not record or record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido o expirado")

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido o expirado")

    user.hashed_password = hash_password(payload.new_password)
    record.used = True
    db.commit()


class UpdateMeRequest(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=100)
    escuela: str | None = Field(None, max_length=200)
    ciudad: str | None = Field(None, max_length=100)
    estado: str | None = Field(None, max_length=100)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UpdateMeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.nombre is not None:
        current_user.nombre = payload.nombre
    if payload.escuela is not None:
        current_user.escuela = payload.escuela
    if payload.ciudad is not None:
        current_user.ciudad = payload.ciudad
    if payload.estado is not None:
        current_user.estado = payload.estado
    db.commit()
    db.refresh(current_user)
    return current_user
