import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models.holding import Holding
from models.insignia import InsigniaAlumno
from models.orden import Orden, TipoOrdenEnum

BADGES = {
    "primera_orden": "Ejecutaste tu primera operación",
    "primera_ganancia": "Tienes una posición con ganancias",
    "portafolio_diversificado": "Tienes 5 o más activos distintos",
    "sin_miedo_a_vender": "Ejecutaste tu primera venta",
    "operador_activo": "Has realizado 10 o más operaciones",
}


def _otorgar(db: Session, alumno_id: uuid.UUID, grupo_id: uuid.UUID | None, codigo: str) -> bool:
    existe = db.query(InsigniaAlumno).filter(
        InsigniaAlumno.alumno_id == alumno_id,
        InsigniaAlumno.codigo == codigo,
        InsigniaAlumno.grupo_id == grupo_id,
    ).first()
    if existe:
        return False
    db.add(InsigniaAlumno(
        alumno_id=alumno_id,
        grupo_id=grupo_id,
        codigo=codigo,
        otorgada_at=datetime.now(timezone.utc),
    ))
    return True


def evaluar_y_otorgar_insignias(db: Session, alumno_id: uuid.UUID, grupo_id: uuid.UUID | None = None) -> list[str]:
    nuevas = []

    ordenes = db.query(Orden).filter(Orden.alumno_id == alumno_id, Orden.grupo_id == grupo_id).all() if grupo_id else []

    if ordenes:
        if _otorgar(db, alumno_id, grupo_id, "primera_orden"):
            nuevas.append("primera_orden")

    ventas = [o for o in ordenes if o.tipo == TipoOrdenEnum.venta]
    if ventas:
        if _otorgar(db, alumno_id, grupo_id, "sin_miedo_a_vender"):
            nuevas.append("sin_miedo_a_vender")

    if len(ordenes) >= 10:
        if _otorgar(db, alumno_id, grupo_id, "operador_activo"):
            nuevas.append("operador_activo")

    holdings = db.query(Holding).filter(
        Holding.alumno_id == alumno_id,
        Holding.grupo_id == grupo_id,
        Holding.cantidad > 0,
    ).all() if grupo_id else []

    if len(holdings) >= 5:
        if _otorgar(db, alumno_id, grupo_id, "portafolio_diversificado"):
            nuevas.append("portafolio_diversificado")

    if nuevas:
        db.commit()
    return nuevas
