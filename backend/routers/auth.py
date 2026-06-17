from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from auth_utils import create_access_token, hash_password, verify_password
from database import get_db
from limiter import limiter
from models.user import RolEnum, User
from schemas.auth import LoginRequest, RegisterRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    existente = db.query(User).filter(User.email == payload.email).first()
    if existente:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El correo ya esta registrado")

    user = User(
        email=payload.email,
        nombre=payload.nombre,
        hashed_password=hash_password(payload.password),
        rol=RolEnum.alumno,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.rol)
    return TokenResponse(access_token=token, user_id=user.id, nombre=user.nombre, rol=user.rol)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")
    if user.suspendido:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta suspendida")

    token = create_access_token(user.id, user.rol)
    return TokenResponse(access_token=token, user_id=user.id, nombre=user.nombre, rol=user.rol)
