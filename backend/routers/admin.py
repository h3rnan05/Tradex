import uuid
from collections import defaultdict
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from auth_utils import require_admin
from database import get_db
from models.grupo import Grupo
from models.holding import Holding
from models.membership import Membership
from models.orden import Orden
from models.user import RolEnum, User
from precios_utils import obtener_precio_actual
from schemas.user import UserOut

router = APIRouter(prefix="/admin", tags=["admin"])


class GlobalRankingEntry(BaseModel):
    posicion: int
    alumno_id: uuid.UUID
    nombre: str
    email: str
    escuela: str | None
    ciudad: str | None
    estado: str | None
    maestro_nombre: str | None
    grupo_nombre: str | None
    valor_total: Decimal
    rendimiento_porcentaje: Decimal
    num_operaciones: int


@router.get("/stats")
def stats_globales(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    total_usuarios = db.query(User).count()
    total_maestros = db.query(User).filter(User.rol == RolEnum.maestro).count()
    total_alumnos = db.query(User).filter(User.rol == RolEnum.alumno).count()
    total_grupos = db.query(Grupo).count()
    total_ordenes = db.query(Orden).count()
    total_memberships = db.query(Membership).count()
    return {
        "total_usuarios": total_usuarios,
        "total_maestros": total_maestros,
        "total_alumnos": total_alumnos,
        "total_grupos": total_grupos,
        "total_operaciones": total_ordenes,
        "total_participaciones": total_memberships,
    }


@router.get("/maestros", response_model=list[UserOut])
def listar_maestros(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    return db.query(User).filter(User.rol == RolEnum.maestro).order_by(User.nombre).all()


@router.get("/alumnos", response_model=list[UserOut])
def listar_alumnos(
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
    escuela: str | None = Query(None),
    ciudad: str | None = Query(None),
    estado: str | None = Query(None),
):
    q = db.query(User).filter(User.rol == RolEnum.alumno)
    if escuela:
        q = q.filter(User.escuela.ilike(f"%{escuela}%"))
    if ciudad:
        q = q.filter(User.ciudad.ilike(f"%{ciudad}%"))
    if estado:
        q = q.filter(User.estado.ilike(f"%{estado}%"))
    return q.order_by(User.nombre).all()


class CambiarRolPayload(BaseModel):
    rol: str


@router.post("/users/{user_id}/cambiar-rol", response_model=UserOut)
def cambiar_rol(
    user_id: uuid.UUID,
    payload: CambiarRolPayload,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    try:
        nuevo_rol = RolEnum(payload.rol)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Rol inválido: {payload.rol}")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.rol == RolEnum.admin:
        raise HTTPException(status_code=400, detail="No se puede cambiar el rol de otro administrador")
    user.rol = nuevo_rol
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/suspender", response_model=UserOut)
def suspender_usuario(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.rol == RolEnum.admin:
        raise HTTPException(status_code=400, detail="No se puede suspender a otro administrador")
    user.suspendido = not user.suspendido
    db.commit()
    db.refresh(user)
    return user


@router.get("/grupos")
def listar_todos_grupos(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    # Batch fetch membership counts to avoid N+1
    counts_raw = db.query(Membership.grupo_id, func.count().label("n")).group_by(Membership.grupo_id).all()
    counts = {str(r.grupo_id): r.n for r in counts_raw}

    grupos = db.query(Grupo).options(joinedload(Grupo.maestro)).all()
    return [
        {
            "id": str(g.id),
            "nombre": g.nombre,
            "maestro_nombre": g.maestro.nombre if g.maestro else None,
            "maestro_email": g.maestro.email if g.maestro else None,
            "capital_inicial": str(g.capital_inicial),
            "fecha_inicio": g.fecha_inicio.isoformat(),
            "fecha_fin": g.fecha_fin.isoformat(),
            "num_alumnos": counts.get(str(g.id), 0),
        }
        for g in grupos
    ]


@router.get("/ranking-global", response_model=list[GlobalRankingEntry])
def ranking_global(
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
    maestro_id: str | None = Query(None),
    escuela: str | None = Query(None),
    ciudad: str | None = Query(None),
    estado: str | None = Query(None),
):
    query = db.query(Membership).options(
        joinedload(Membership.alumno),
        joinedload(Membership.grupo).joinedload(Grupo.maestro),
    )
    if maestro_id:
        query = query.join(Grupo).filter(Grupo.maestro_id == maestro_id)
    if escuela or ciudad or estado:
        query = query.join(Membership.alumno)
        if escuela:
            query = query.filter(User.escuela.ilike(f"%{escuela}%"))
        if ciudad:
            query = query.filter(User.ciudad.ilike(f"%{ciudad}%"))
        if estado:
            query = query.filter(User.estado.ilike(f"%{estado}%"))

    memberships = query.all()
    if not memberships:
        return []

    grupo_ids = list({m.grupo_id for m in memberships})
    alumno_ids = list({m.alumno_id for m in memberships})

    # Batch fetch holdings
    all_holdings = db.query(Holding).filter(
        Holding.grupo_id.in_(grupo_ids),
        Holding.alumno_id.in_(alumno_ids),
        Holding.cantidad > 0,
    ).all()
    holdings_map: dict = defaultdict(list)
    for h in all_holdings:
        holdings_map[(str(h.alumno_id), str(h.grupo_id))].append(h)

    # Batch fetch order counts
    orden_counts_raw = db.query(
        Orden.alumno_id, Orden.grupo_id, func.count().label("n")
    ).filter(
        Orden.grupo_id.in_(grupo_ids),
        Orden.alumno_id.in_(alumno_ids),
    ).group_by(Orden.alumno_id, Orden.grupo_id).all()
    orden_counts = {(str(r.alumno_id), str(r.grupo_id)): r.n for r in orden_counts_raw}

    precios_cache: dict[str, Decimal] = {}
    entradas = []

    for m in memberships:
        key = (str(m.alumno_id), str(m.grupo_id))
        holdings = holdings_map[key]
        num_ops = orden_counts.get(key, 0)

        valor_holdings = Decimal("0")
        for h in holdings:
            if h.ticker not in precios_cache:
                try:
                    precios_cache[h.ticker] = obtener_precio_actual(h.ticker)
                except Exception:
                    precios_cache[h.ticker] = h.precio_promedio
            valor_holdings += precios_cache[h.ticker] * h.cantidad

        valor_total = m.capital_disponible + valor_holdings
        capital_inicial = m.grupo.capital_inicial
        rendimiento_pct = ((valor_total - capital_inicial) / capital_inicial * 100) if capital_inicial else Decimal("0")

        entradas.append(GlobalRankingEntry(
            posicion=0,
            alumno_id=m.alumno_id,
            nombre=m.alumno.nombre,
            email=m.alumno.email,
            escuela=getattr(m.alumno, "escuela", None),
            ciudad=getattr(m.alumno, "ciudad", None),
            estado=getattr(m.alumno, "estado", None),
            maestro_nombre=m.grupo.maestro.nombre if m.grupo.maestro else None,
            grupo_nombre=m.grupo.nombre,
            valor_total=valor_total,
            rendimiento_porcentaje=rendimiento_pct,
            num_operaciones=num_ops,
        ))

    entradas.sort(key=lambda e: e.valor_total, reverse=True)
    for i, e in enumerate(entradas):
        e.posicion = i + 1
    return entradas


@router.get("/sponsors", response_model=list[UserOut])
def listar_sponsors(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    return db.query(User).filter(User.rol == RolEnum.sponsor).order_by(User.nombre).all()


@router.post("/grupos/{grupo_id}/asignar-sponsor")
def asignar_sponsor(
    grupo_id: str,
    sponsor_id: str | None = Query(None),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")

    if sponsor_id:
        try:
            sponsor_uuid = uuid.UUID(sponsor_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="sponsor_id inválido")
        sponsor = db.query(User).filter(User.id == sponsor_uuid, User.rol == RolEnum.sponsor).first()
        if not sponsor:
            raise HTTPException(status_code=404, detail="Patrocinador no encontrado")
        grupo.sponsor_id = sponsor_uuid
    else:
        grupo.sponsor_id = None

    db.commit()
    return {"ok": True}
