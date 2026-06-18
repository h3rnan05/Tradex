import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth_utils import require_alumno
from database import get_db
from models.alerta import Alerta
from models.grupo import Grupo
from models.membership import Membership
from models.orden_pendiente import EstadoOrdenEnum, OrdenPendiente
from models.user import User
from precios_utils import obtener_precio_actual
from routers.ordenes import ejecutar_compra, _get_membership

router = APIRouter(prefix="/ordenes-limite", tags=["ordenes-limite"])


class OrdenLimiteCreate(BaseModel):
    grupo_id: uuid.UUID
    ticker: str
    tipo: str  # "compra" | "venta"
    cantidad: Decimal
    precio_limite: Decimal


class AlertaCreate(BaseModel):
    ticker: str
    precio_objetivo: Decimal
    condicion: str  # "gte" | "lte"


def _procesar_ordenes_pendientes(db: Session, alumno: User) -> list[OrdenPendiente]:
    """Check and execute any pending limit orders whose trigger price was hit."""
    pendientes = (
        db.query(OrdenPendiente)
        .filter(
            OrdenPendiente.alumno_id == alumno.id,
            OrdenPendiente.estado == EstadoOrdenEnum.pendiente,
        )
        .all()
    )
    ejecutadas = []
    for op_pendiente in pendientes:
        try:
            precio_actual = obtener_precio_actual(op_pendiente.ticker)
        except Exception:
            continue

        debe_ejecutar = False
        if op_pendiente.tipo == "compra" and precio_actual <= op_pendiente.precio_limite:
            debe_ejecutar = True
        elif op_pendiente.tipo == "venta" and precio_actual >= op_pendiente.precio_limite:
            debe_ejecutar = True

        if not debe_ejecutar:
            continue

        try:
            membership = db.query(Membership).filter(
                Membership.alumno_id == alumno.id,
                Membership.grupo_id == op_pendiente.grupo_id,
            ).first()
            grupo = db.query(Grupo).filter(Grupo.id == op_pendiente.grupo_id).first()
            if not membership or not grupo:
                continue
            if membership.pausado:
                continue

            if op_pendiente.tipo == "compra":
                ejecutar_compra(db, alumno, membership, grupo, op_pendiente.ticker, op_pendiente.cantidad)
            # Venta límite: execute at market when price >= limit
            else:
                from models.holding import Holding
                from models.orden import Orden, TipoOrdenEnum
                holding = db.query(Holding).filter(
                    Holding.alumno_id == alumno.id,
                    Holding.grupo_id == op_pendiente.grupo_id,
                    Holding.ticker == op_pendiente.ticker,
                ).first()
                if not holding or holding.cantidad < op_pendiente.cantidad:
                    op_pendiente.estado = EstadoOrdenEnum.cancelada
                    continue
                monto = precio_actual * op_pendiente.cantidad
                comision = monto * grupo.comision_porcentaje
                holding.cantidad -= op_pendiente.cantidad
                if holding.cantidad == 0:
                    holding.precio_promedio = Decimal("0")
                membership.capital_disponible += monto - comision
                orden = Orden(
                    alumno_id=alumno.id,
                    grupo_id=op_pendiente.grupo_id,
                    ticker=op_pendiente.ticker,
                    tipo=TipoOrdenEnum.venta,
                    cantidad=op_pendiente.cantidad,
                    precio_ejecucion=precio_actual,
                    comision=comision,
                )
                db.add(orden)

            op_pendiente.estado = EstadoOrdenEnum.ejecutada
            op_pendiente.ejecutada_en = datetime.now(timezone.utc)
            ejecutadas.append(op_pendiente)
        except Exception:
            continue

    if ejecutadas:
        db.commit()
        try:
            from insignias_engine import evaluar_y_otorgar_insignias, _otorgar
            for op in ejecutadas:
                _otorgar(db, alumno.id, op.grupo_id, "orden_limite_ejecutada")
            db.commit()
        except Exception:
            pass
    return ejecutadas


def _procesar_alertas(db: Session, alumno: User) -> list[Alerta]:
    """Check and trigger any active price alerts."""
    alertas = (
        db.query(Alerta)
        .filter(Alerta.alumno_id == alumno.id, Alerta.activa == True, Alerta.disparada == False)
        .all()
    )
    disparadas = []
    tickers_vistos: dict[str, Decimal] = {}
    for alerta in alertas:
        if alerta.ticker not in tickers_vistos:
            try:
                tickers_vistos[alerta.ticker] = obtener_precio_actual(alerta.ticker)
            except Exception:
                continue
        precio = tickers_vistos[alerta.ticker]
        dispara = (
            (alerta.condicion == "gte" and precio >= alerta.precio_objetivo) or
            (alerta.condicion == "lte" and precio <= alerta.precio_objetivo)
        )
        if dispara:
            alerta.disparada = True
            alerta.disparada_en = datetime.now(timezone.utc)
            disparadas.append(alerta)
    if disparadas:
        db.commit()
    return disparadas


# ── Limit orders ──────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
def crear_orden_limite(payload: OrdenLimiteCreate, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    if payload.tipo not in ("compra", "venta"):
        raise HTTPException(status_code=400, detail="tipo debe ser 'compra' o 'venta'")
    if payload.cantidad <= 0 or payload.precio_limite <= 0:
        raise HTTPException(status_code=400, detail="Cantidad y precio deben ser mayores a cero")

    membership = _get_membership(db, alumno, payload.grupo_id)  # validates membership

    op = OrdenPendiente(
        alumno_id=alumno.id,
        grupo_id=payload.grupo_id,
        ticker=payload.ticker.upper().strip(),
        tipo=payload.tipo,
        cantidad=payload.cantidad,
        precio_limite=payload.precio_limite,
    )
    db.add(op)
    db.commit()
    db.refresh(op)
    return {
        "id": str(op.id),
        "ticker": op.ticker,
        "tipo": op.tipo,
        "cantidad": str(op.cantidad),
        "precio_limite": str(op.precio_limite),
        "estado": op.estado,
        "creada_en": op.creada_en.isoformat(),
    }


@router.get("")
def listar_ordenes_limite(db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    # Process pending orders first, then return updated list
    _procesar_ordenes_pendientes(db, alumno)
    ordenes = (
        db.query(OrdenPendiente)
        .filter(OrdenPendiente.alumno_id == alumno.id)
        .order_by(OrdenPendiente.creada_en.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": str(o.id),
            "ticker": o.ticker,
            "tipo": o.tipo,
            "cantidad": str(o.cantidad),
            "precio_limite": str(o.precio_limite),
            "estado": o.estado,
            "creada_en": o.creada_en.isoformat() if o.creada_en else None,
            "ejecutada_en": o.ejecutada_en.isoformat() if o.ejecutada_en else None,
        }
        for o in ordenes
    ]


@router.delete("/{orden_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancelar_orden_limite(orden_id: uuid.UUID, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    op = db.query(OrdenPendiente).filter(
        OrdenPendiente.id == orden_id, OrdenPendiente.alumno_id == alumno.id
    ).first()
    if not op:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    if op.estado != EstadoOrdenEnum.pendiente:
        raise HTTPException(status_code=400, detail="Solo se pueden cancelar órdenes pendientes")
    op.estado = EstadoOrdenEnum.cancelada
    db.commit()


# ── Price alerts ──────────────────────────────────────────────

@router.post("/alertas", status_code=status.HTTP_201_CREATED)
def crear_alerta(payload: AlertaCreate, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    if payload.condicion not in ("gte", "lte"):
        raise HTTPException(status_code=400, detail="condicion debe ser 'gte' o 'lte'")
    alerta = Alerta(
        alumno_id=alumno.id,
        ticker=payload.ticker.upper().strip(),
        precio_objetivo=payload.precio_objetivo,
        condicion=payload.condicion,
    )
    db.add(alerta)
    db.commit()
    db.refresh(alerta)
    try:
        from insignias_engine import _otorgar
        if _otorgar(db, alumno.id, None, "alerta_puesta"):
            db.commit()
    except Exception:
        pass
    return {
        "id": str(alerta.id),
        "ticker": alerta.ticker,
        "precio_objetivo": str(alerta.precio_objetivo),
        "condicion": alerta.condicion,
        "activa": alerta.activa,
        "disparada": alerta.disparada,
    }


@router.get("/alertas")
def listar_alertas(db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    _procesar_alertas(db, alumno)
    alertas = (
        db.query(Alerta)
        .filter(Alerta.alumno_id == alumno.id, Alerta.activa == True)
        .order_by(Alerta.creada_en.desc())
        .all()
    )
    return [
        {
            "id": str(a.id),
            "ticker": a.ticker,
            "precio_objetivo": str(a.precio_objetivo),
            "condicion": a.condicion,
            "disparada": a.disparada,
            "disparada_en": a.disparada_en.isoformat() if a.disparada_en else None,
        }
        for a in alertas
    ]


@router.delete("/alertas/{alerta_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_alerta(alerta_id: uuid.UUID, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    alerta = db.query(Alerta).filter(
        Alerta.id == alerta_id, Alerta.alumno_id == alumno.id
    ).first()
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    alerta.activa = False
    db.commit()


@router.get("/notificaciones")
def obtener_notificaciones(db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    """Return recently executed limit orders and triggered alerts for in-app notifications."""
    _procesar_ordenes_pendientes(db, alumno)
    _procesar_alertas(db, alumno)

    desde = datetime.now(timezone.utc).replace(microsecond=0)
    from datetime import timedelta
    desde = desde - timedelta(minutes=60)

    ordenes_ejecutadas = (
        db.query(OrdenPendiente)
        .filter(
            OrdenPendiente.alumno_id == alumno.id,
            OrdenPendiente.estado == EstadoOrdenEnum.ejecutada,
            OrdenPendiente.ejecutada_en >= desde,
        )
        .order_by(OrdenPendiente.ejecutada_en.desc())
        .limit(10)
        .all()
    )

    alertas_disparadas = (
        db.query(Alerta)
        .filter(
            Alerta.alumno_id == alumno.id,
            Alerta.disparada == True,
            Alerta.disparada_en >= desde,
        )
        .order_by(Alerta.disparada_en.desc())
        .limit(10)
        .all()
    )

    notifs = []
    for o in ordenes_ejecutadas:
        notifs.append({
            "id": f"orden-{o.id}",
            "tipo": "orden_ejecutada",
            "mensaje": f"Orden {o.tipo} de {o.cantidad} {o.ticker} ejecutada a ${o.precio_limite}",
            "ticker": o.ticker,
            "ts": o.ejecutada_en.isoformat() if o.ejecutada_en else None,
        })
    for a in alertas_disparadas:
        cond = "subió a" if a.condicion == "gte" else "bajó a"
        notifs.append({
            "id": f"alerta-{a.id}",
            "tipo": "alerta_precio",
            "mensaje": f"Alerta: {a.ticker} {cond} ${a.precio_objetivo}",
            "ticker": a.ticker,
            "ts": a.disparada_en.isoformat() if a.disparada_en else None,
        })

    notifs.sort(key=lambda n: n["ts"] or "", reverse=True)
    return notifs
