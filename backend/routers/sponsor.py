import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from auth_utils import get_current_user, require_sponsor
from database import get_db
from models.grupo import Grupo
from models.holding import Holding
from models.membership import Membership
from models.orden import Orden
from models.user import RolEnum, User
from portfolio_utils import calcular_valor_holdings, calcular_rendimiento

router = APIRouter(prefix="/sponsor", tags=["sponsor"])


@router.get("/mis-grupos")
def mis_grupos(db: Session = Depends(get_db), current_user: User = Depends(require_sponsor)):
    grupos = db.query(Grupo).options(joinedload(Grupo.maestro)).filter(
        Grupo.sponsor_id == current_user.id
    ).all()
    result = []
    for g in grupos:
        num_alumnos = db.query(Membership).filter(Membership.grupo_id == g.id).count()
        num_ops = db.query(Orden).filter(Orden.grupo_id == g.id).count()
        result.append({
            "id": str(g.id),
            "nombre": g.nombre,
            "maestro_nombre": g.maestro.nombre if g.maestro else None,
            "capital_inicial": str(g.capital_inicial),
            "fecha_inicio": g.fecha_inicio.isoformat(),
            "fecha_fin": g.fecha_fin.isoformat(),
            "num_alumnos": num_alumnos,
            "num_operaciones": num_ops,
            "activos_permitidos": g.activos_permitidos,
        })
    return result


@router.get("/ranking/{grupo_id}")
def ranking_grupo_sponsor(
    grupo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_sponsor),
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    if str(grupo.sponsor_id) != str(current_user.id) and current_user.rol != RolEnum.admin:
        raise HTTPException(status_code=403, detail="No autorizado")

    memberships = db.query(Membership).options(joinedload(Membership.alumno)).filter(
        Membership.grupo_id == grupo_id
    ).all()

    precios_cache: dict[str, Decimal] = {}
    entradas = []

    for m in memberships:
        holdings = db.query(Holding).filter(
            Holding.alumno_id == m.alumno_id, Holding.grupo_id == grupo_id, Holding.cantidad > 0
        ).all()
        num_ops = db.query(Orden).filter(
            Orden.alumno_id == m.alumno_id, Orden.grupo_id == grupo_id
        ).count()

        valor_holdings = calcular_valor_holdings(holdings, precios_cache)
        valor_total = m.capital_disponible + valor_holdings
        _, rendimiento_pct = calcular_rendimiento(valor_total, grupo.capital_inicial)
        entradas.append({
            "posicion": 0,
            "nombre": m.alumno.nombre,
            "escuela": getattr(m.alumno, "escuela", None),
            "ciudad": getattr(m.alumno, "ciudad", None),
            "estado": getattr(m.alumno, "estado", None),
            "valor_total": float(valor_total),
            "rendimiento_porcentaje": float(rendimiento_pct),
            "num_operaciones": num_ops,
            "pausado": m.pausado,
        })

    entradas.sort(key=lambda e: e["valor_total"], reverse=True)
    for i, e in enumerate(entradas):
        e["posicion"] = i + 1
    return entradas
