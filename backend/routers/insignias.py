import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth_utils import require_alumno, require_maestro
from database import get_db
from insignias_engine import BADGES, evaluar_y_otorgar_insignias
from models.grupo import Grupo
from models.insignia import InsigniaAlumno
from models.membership import Membership
from models.user import User

router = APIRouter(prefix="/insignias", tags=["insignias"])


class OtorgarRequest(BaseModel):
    alumno_id: uuid.UUID
    codigo: str
    grupo_id: uuid.UUID | None = None


@router.get("/catalogo")
def catalogo_insignias(_maestro: User = Depends(require_maestro)):
    """Catálogo completo de insignias disponibles para otorgar."""
    return [
        {"codigo": codigo, "descripcion": d["descripcion"], "nivel": d["nivel"], "icono": d["icono"]}
        for codigo, d in BADGES.items()
    ]


@router.get("/grupo/{grupo_id}")
def insignias_grupo(
    grupo_id: uuid.UUID,
    db: Session = Depends(get_db),
    maestro: User = Depends(require_maestro),
):
    """Insignias de todos los alumnos del grupo: {alumno_id: [codigos]}."""
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id, Grupo.maestro_id == maestro.id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    insignias = db.query(InsigniaAlumno).filter(InsigniaAlumno.grupo_id == grupo_id).all()
    resultado: dict[str, list[str]] = {}
    for i in insignias:
        resultado.setdefault(str(i.alumno_id), []).append(i.codigo)
    return resultado


@router.post("/otorgar", status_code=status.HTTP_201_CREATED)
def otorgar_insignia(
    payload: OtorgarRequest,
    db: Session = Depends(get_db),
    maestro: User = Depends(require_maestro),
):
    """El maestro otorga manualmente una insignia a un alumno de su grupo."""
    if payload.codigo not in BADGES:
        raise HTTPException(status_code=400, detail="Insignia desconocida")
    if payload.grupo_id is not None:
        grupo = db.query(Grupo).filter(Grupo.id == payload.grupo_id, Grupo.maestro_id == maestro.id).first()
        if not grupo:
            raise HTTPException(status_code=404, detail="Grupo no encontrado")
        miembro = db.query(Membership).filter(
            Membership.grupo_id == payload.grupo_id, Membership.alumno_id == payload.alumno_id
        ).first()
        if not miembro:
            raise HTTPException(status_code=404, detail="El alumno no pertenece al grupo")
    existe = db.query(InsigniaAlumno).filter(
        InsigniaAlumno.alumno_id == payload.alumno_id,
        InsigniaAlumno.codigo == payload.codigo,
        InsigniaAlumno.grupo_id == payload.grupo_id,
    ).first()
    if existe:
        return {"otorgada": False, "ya_existia": True}
    db.add(InsigniaAlumno(
        alumno_id=payload.alumno_id,
        grupo_id=payload.grupo_id,
        codigo=payload.codigo,
        otorgada_at=datetime.now(timezone.utc),
    ))
    db.commit()
    return {"otorgada": True, "ya_existia": False}


@router.post("/revocar", status_code=status.HTTP_200_OK)
def revocar_insignia(
    payload: OtorgarRequest,
    db: Session = Depends(get_db),
    maestro: User = Depends(require_maestro),
):
    """El maestro quita una insignia previamente otorgada a un alumno de su grupo."""
    if payload.grupo_id is not None:
        grupo = db.query(Grupo).filter(Grupo.id == payload.grupo_id, Grupo.maestro_id == maestro.id).first()
        if not grupo:
            raise HTTPException(status_code=404, detail="Grupo no encontrado")
    insignia = db.query(InsigniaAlumno).filter(
        InsigniaAlumno.alumno_id == payload.alumno_id,
        InsigniaAlumno.codigo == payload.codigo,
        InsigniaAlumno.grupo_id == payload.grupo_id,
    ).first()
    if insignia:
        db.delete(insignia)
        db.commit()
    return {"revocada": True}


@router.get("/mis-insignias")
def mis_insignias(
    grupo_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
    alumno: User = Depends(require_alumno),
):
    evaluar_y_otorgar_insignias(db, alumno.id, grupo_id)
    q = db.query(InsigniaAlumno).filter(InsigniaAlumno.alumno_id == alumno.id)
    insignias = q.all()
    return [
        {
            "codigo": i.codigo,
            "descripcion": BADGES.get(i.codigo, ""),
            "grupo_id": str(i.grupo_id) if i.grupo_id else None,
            "otorgada_at": i.otorgada_at.isoformat(),
        }
        for i in insignias
    ]


@router.get("/alumno/{alumno_id}")
def insignias_alumno(
    alumno_id: uuid.UUID,
    db: Session = Depends(get_db),
    _maestro: User = Depends(require_maestro),
):
    insignias = db.query(InsigniaAlumno).filter(InsigniaAlumno.alumno_id == alumno_id).all()
    return [
        {
            "codigo": i.codigo,
            "descripcion": BADGES.get(i.codigo, ""),
            "grupo_id": str(i.grupo_id) if i.grupo_id else None,
            "otorgada_at": i.otorgada_at.isoformat(),
        }
        for i in insignias
    ]
