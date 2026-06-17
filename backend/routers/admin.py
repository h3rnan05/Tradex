import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from auth_utils import require_admin
from database import get_db
from models.grupo import Grupo
from models.holding import Holding
from models.membership import Membership
from models.orden import Orden
from models.user import RolEnum, User
from precios_utils import obtener_precio_actual

router = APIRouter(prefix="/admin", tags=["admin"])


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    nombre: str
    rol: str
    escuela: str | None
    ciudad: str | None
    estado: str | None
    suspendido: bool

    class Config:
        from_attributes = True


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
            "num_alumnos": db.query(Membership).filter(Membership.grupo_id == g.id).count(),
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

    precios_cache: dict[str, Decimal] = {}
    entradas = []

    for m in memberships:
        holdings = db.query(Holding).filter(
            Holding.alumno_id == m.alumno_id, Holding.grupo_id == m.grupo_id, Holding.cantidad > 0
        ).all()
        num_ops = db.query(Orden).filter(Orden.alumno_id == m.alumno_id, Orden.grupo_id == m.grupo_id).count()

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
