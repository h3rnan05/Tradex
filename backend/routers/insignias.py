import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from auth_utils import get_current_user, require_alumno, require_maestro
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


# Puntos por nivel de insignia para el ranking por medallas.
_PUNTOS_NIVEL = {"facil": 1, "medio": 2, "dificil": 3, "legendario": 5}


@router.get("/ranking/{grupo_id}")
def ranking_insignias(
    grupo_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ranking del grupo por insignias (cantidad y puntos por nivel).
    Accesible para cualquier miembro del grupo o su maestro."""
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    es_maestro = grupo.maestro_id == current_user.id
    es_miembro = db.query(Membership).filter(
        Membership.grupo_id == grupo_id, Membership.alumno_id == current_user.id
    ).first()
    if not es_maestro and not es_miembro:
        raise HTTPException(status_code=403, detail="No perteneces a este grupo")

    miembros = (
        db.query(Membership).options(joinedload(Membership.alumno))
        .filter(Membership.grupo_id == grupo_id).all()
    )
    for m in miembros:
        evaluar_y_otorgar_insignias(db, m.alumno_id, grupo_id)
    db.commit()

    insignias = db.query(InsigniaAlumno).filter(InsigniaAlumno.grupo_id == grupo_id).all()
    por_alumno: dict[str, list[str]] = {}
    for i in insignias:
        por_alumno.setdefault(str(i.alumno_id), []).append(i.codigo)

    filas = []
    for m in miembros:
        codigos = por_alumno.get(str(m.alumno_id), [])
        puntos = sum(_PUNTOS_NIVEL.get(BADGES.get(c, {}).get("nivel", ""), 0) for c in codigos)
        filas.append({
            "alumno_id": str(m.alumno_id),
            "nombre": m.alumno.nombre if m.alumno else "—",
            "total": len(codigos),
            "puntos": puntos,
        })
    filas.sort(key=lambda f: (f["puntos"], f["total"]), reverse=True)
    return filas


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
