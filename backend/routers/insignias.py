import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from auth_utils import require_alumno, require_maestro
from database import get_db
from insignias_engine import BADGES, evaluar_y_otorgar_insignias
from models.insignia import InsigniaAlumno
from models.user import User

router = APIRouter(prefix="/insignias", tags=["insignias"])


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
