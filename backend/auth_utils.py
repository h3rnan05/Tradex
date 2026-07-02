import uuid
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.user import RolEnum, User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: uuid.UUID, rol: RolEnum) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "rol": rol.value, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)  # type: ignore[arg-type]


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar la sesion",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception

    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if user is None:
        raise credentials_exception
    if user.suspendido:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta suspendida")
    return user


def require_maestro(user: User = Depends(get_current_user)) -> User:
    if user.rol != RolEnum.maestro:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo un maestro puede realizar esta accion")
    return user


def require_alumno(user: User = Depends(get_current_user)) -> User:
    if user.rol != RolEnum.alumno:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo un alumno puede realizar esta accion")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.rol != RolEnum.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requiere rol de administrador")
    return current_user


def require_sponsor(current_user: User = Depends(get_current_user)) -> User:
    from models.user import RolEnum
    if current_user.rol not in (RolEnum.sponsor, RolEnum.admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requiere rol de patrocinador")
    return current_user


def maestro_owns_alumno(db: Session, maestro_id: uuid.UUID, alumno_id: str) -> bool:
    """Return True if the maestro owns at least one group containing the alumno."""
    from models.membership import Membership
    from models.grupo import Grupo
    return (
        db.query(Membership)
        .join(Grupo, Membership.grupo_id == Grupo.id)
        .filter(Membership.alumno_id == alumno_id, Grupo.maestro_id == maestro_id)
        .first()
    ) is not None
