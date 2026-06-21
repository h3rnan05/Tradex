import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth_utils import require_alumno, require_maestro
from database import get_db
from insignias_engine import BADGES, evaluar_y_otorgar_insignias
from models.grupo import Grupo
from models.insignia import InsigniaAlumno
from models.membership import Membership
from models.user import User

router = APIRouter(prefix="/insignias", tags=["insignias"])


@router.get("/grupo/{grupo_id}")
def insignias_grupo(
    grupo_id: uuid.UUID,
    db: Session = Depends(get_db),
    maestro: User = Depends(require_maestro),
):
    """Insignias de todos los alumnos del grupo: {alumno_id: [codigos]}.

    Antes de devolver, corre la evaluación automática para cada alumno del
    grupo, de modo que los conteos estén al día aunque el alumno no haya
    abierto su pantalla de logros."""
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id, Grupo.maestro_id == maestro.id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")

    miembros = db.query(Membership).filter(Membership.grupo_id == grupo_id).all()
    for m in miembros:
        evaluar_y_otorgar_insignias(db, m.alumno_id, grupo_id)
    db.commit()

    insignias = db.query(InsigniaAlumno).filter(InsigniaAlumno.grupo_id == grupo_id).all()
    resultado: dict[str, list[str]] = {}
    for i in insignias:
        resultado.setdefault(str(i.alumno_id), []).append(i.codigo)
    return resultado


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
