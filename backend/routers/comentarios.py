import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth_utils import get_current_user, require_maestro
from database import get_db
from models.comentario import ComentarioOrden
from models.orden import Orden
from models.user import User

router = APIRouter(prefix="/comentarios", tags=["comentarios"])


class ComentarioCreate(BaseModel):
    texto: str = Field(..., min_length=1, max_length=1000)


@router.post("/orden/{orden_id}", status_code=status.HTTP_201_CREATED)
def crear_comentario(
    orden_id: uuid.UUID,
    payload: ComentarioCreate,
    db: Session = Depends(get_db),
    maestro: User = Depends(require_maestro),
):
    orden = db.query(Orden).filter(Orden.id == orden_id).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    comentario = ComentarioOrden(
        orden_id=orden_id,
        maestro_id=maestro.id,
        grupo_id=orden.grupo_id,
        texto=payload.texto.strip(),
        created_at=datetime.now(timezone.utc),
    )
    db.add(comentario)
    db.commit()
    db.refresh(comentario)
    return {
        "id": str(comentario.id),
        "orden_id": str(comentario.orden_id),
        "texto": comentario.texto,
        "maestro_id": str(comentario.maestro_id),
        "created_at": comentario.created_at.isoformat(),
    }


@router.get("/orden/{orden_id}")
def listar_comentarios_orden(
    orden_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    orden = db.query(Orden).filter(Orden.id == orden_id).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    if current_user.rol == "alumno" and orden.alumno_id != current_user.id:
        raise HTTPException(status_code=403, detail="No autorizado")

    comentarios = db.query(ComentarioOrden).filter(ComentarioOrden.orden_id == orden_id).order_by(ComentarioOrden.created_at).all()
    return [
        {
            "id": str(c.id),
            "texto": c.texto,
            "maestro_id": str(c.maestro_id),
            "created_at": c.created_at.isoformat(),
        }
        for c in comentarios
    ]


@router.get("/alumno/{alumno_id}")
def comentarios_alumno(
    alumno_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.rol == "alumno" and current_user.id != alumno_id:
        raise HTTPException(status_code=403, detail="No autorizado")

    ordenes_ids = [o.id for o in db.query(Orden).filter(Orden.alumno_id == alumno_id).all()]
    if not ordenes_ids:
        return []

    comentarios = (
        db.query(ComentarioOrden)
        .filter(ComentarioOrden.orden_id.in_(ordenes_ids))
        .order_by(ComentarioOrden.created_at.desc())
        .all()
    )
    return [
        {
            "id": str(c.id),
            "orden_id": str(c.orden_id),
            "texto": c.texto,
            "maestro_id": str(c.maestro_id),
            "created_at": c.created_at.isoformat(),
        }
        for c in comentarios
    ]


@router.delete("/{comentario_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_comentario(
    comentario_id: uuid.UUID,
    db: Session = Depends(get_db),
    maestro: User = Depends(require_maestro),
):
    c = db.query(ComentarioOrden).filter(ComentarioOrden.id == comentario_id, ComentarioOrden.maestro_id == maestro.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    db.delete(c)
    db.commit()
