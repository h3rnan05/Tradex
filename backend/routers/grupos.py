from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from auth_utils import require_maestro
from database import get_db
from models.grupo import Grupo
from models.membership import Membership
from models.user import RolEnum, User
from schemas.grupo import GrupoCreate, GrupoDetalle, GrupoOut, InvitarRequest
from schemas.membership import MembershipOut

router = APIRouter(prefix="/grupos", tags=["grupos"])


@router.post("", response_model=GrupoOut, status_code=status.HTTP_201_CREATED)
def crear_grupo(payload: GrupoCreate, db: Session = Depends(get_db), maestro: User = Depends(require_maestro)):
    grupo = Grupo(
        nombre=payload.nombre,
        maestro_id=maestro.id,
        fecha_inicio=payload.fecha_inicio,
        fecha_fin=payload.fecha_fin,
        capital_inicial=payload.capital_inicial,
    )
    db.add(grupo)
    db.commit()
    db.refresh(grupo)
    return grupo


@router.get("", response_model=list[GrupoOut])
def listar_grupos(db: Session = Depends(get_db), maestro: User = Depends(require_maestro)):
    return db.query(Grupo).filter(Grupo.maestro_id == maestro.id).all()


@router.get("/{grupo_id}", response_model=GrupoDetalle)
def detalle_grupo(grupo_id: str, db: Session = Depends(get_db), maestro: User = Depends(require_maestro)):
    grupo = (
        db.query(Grupo)
        .options(joinedload(Grupo.memberships))
        .filter(Grupo.id == grupo_id, Grupo.maestro_id == maestro.id)
        .first()
    )
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")

    from models.holding import Holding
    from models.orden import Orden

    holdings = db.query(Holding).filter(Holding.grupo_id == grupo.id).all()
    ordenes = (
        db.query(Orden)
        .filter(Orden.grupo_id == grupo.id)
        .order_by(Orden.timestamp.desc())
        .limit(50)
        .all()
    )

    detalle = GrupoDetalle.model_validate(grupo)
    detalle.holdings = holdings
    detalle.ordenes = ordenes
    return detalle


@router.post("/{grupo_id}/invitar", response_model=MembershipOut, status_code=status.HTTP_201_CREATED)
def invitar_alumno(
    grupo_id: str,
    payload: InvitarRequest,
    db: Session = Depends(get_db),
    maestro: User = Depends(require_maestro),
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id, Grupo.maestro_id == maestro.id).first()
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")

    alumno = db.query(User).filter(User.email == payload.alumno_email, User.rol == RolEnum.alumno).first()
    if not alumno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alumno no encontrado")

    existente = db.query(Membership).filter(
        Membership.grupo_id == grupo.id, Membership.alumno_id == alumno.id
    ).first()
    if existente:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El alumno ya pertenece al grupo")

    membership = Membership(
        grupo_id=grupo.id,
        alumno_id=alumno.id,
        capital_disponible=grupo.capital_inicial,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership
