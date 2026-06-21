from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from auth_utils import get_current_user, require_alumno, require_maestro
from database import get_db
from escenarios_historicos import obtener_escenario, precio_simulado
from insignias_engine import _otorgar
from models.grupo import Grupo
from models.membership import Membership
from models.reto import Reto, RetoHolding, RetoOrden, RetoParticipante, TipoOrdenRetoEnum
from models.user import RolEnum, User
from precios_utils import normalizar_ticker, obtener_precio_actual
from schemas.reto import (
    RetoCreate,
    RetoEstadoOut,
    RetoHoldingOut,
    RetoOrdenCreate,
    RetoOrdenOut,
    RetoOut,
    RetoRankingEntry,
)

router = APIRouter(tags=["retos"])


def _grupo_del_maestro(db: Session, grupo_id: str, maestro: User) -> Grupo:
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id, Grupo.maestro_id == maestro.id).first()
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")
    return grupo


def _activos_lista(reto: Reto) -> list[str]:
    if not reto.activos_permitidos:
        return []
    return [t for t in (x.strip() for x in reto.activos_permitidos.split(",")) if t]


def _precio_reto(reto: Reto, ticker: str):
    """Precio de un ticker para el reto: en vivo si es reto de activos,
    simulado si es reto de escenario histórico."""
    if reto.activos_permitidos:
        return obtener_precio_actual(ticker)
    return precio_simulado(ticker, reto.escenario_id, reto.fecha_inicio, reto.fecha_fin)


def _participante(db: Session, reto_id: str, alumno: User) -> RetoParticipante:
    participante = db.query(RetoParticipante).filter(
        RetoParticipante.reto_id == reto_id, RetoParticipante.alumno_id == alumno.id
    ).first()
    if not participante:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No participas en este reto")
    return participante


@router.post("/grupos/{grupo_id}/retos", response_model=RetoOut, status_code=status.HTTP_201_CREATED)
def crear_reto(
    grupo_id: str, payload: RetoCreate, db: Session = Depends(get_db), maestro: User = Depends(require_maestro)
):
    _grupo_del_maestro(db, grupo_id, maestro)

    if payload.fecha_fin <= payload.fecha_inicio:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La fecha de fin debe ser posterior al inicio")

    activos_str = None
    if payload.activos_permitidos:
        # Reto de activos en vivo.
        tickers = [normalizar_ticker(t) for t in payload.activos_permitidos if t.strip()]
        if not tickers:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debes indicar al menos un activo")
        activos_str = ",".join(tickers)
    elif payload.escenario_id:
        # Reto de escenario histórico.
        obtener_escenario(payload.escenario_id)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Indica un escenario o una lista de activos")

    reto = Reto(
        grupo_id=grupo_id,
        escenario_id=payload.escenario_id if not activos_str else None,
        activos_permitidos=activos_str,
        nombre=payload.nombre,
        fecha_inicio=payload.fecha_inicio,
        fecha_fin=payload.fecha_fin,
        capital_inicial=payload.capital_inicial,
    )
    db.add(reto)
    db.flush()

    memberships = db.query(Membership).filter(Membership.grupo_id == grupo_id).all()
    for m in memberships:
        db.add(RetoParticipante(reto_id=reto.id, alumno_id=m.alumno_id, capital_disponible=payload.capital_inicial))

    db.commit()
    db.refresh(reto)
    return reto


@router.get("/grupos/{grupo_id}/retos", response_model=list[RetoOut])
def listar_retos_grupo(grupo_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")

    es_maestro_del_grupo = current_user.rol == RolEnum.maestro and grupo.maestro_id == current_user.id
    es_alumno_del_grupo = db.query(Membership).filter(
        Membership.grupo_id == grupo_id, Membership.alumno_id == current_user.id
    ).first()
    if not es_maestro_del_grupo and not es_alumno_del_grupo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    return db.query(Reto).filter(Reto.grupo_id == grupo_id).order_by(Reto.created_at.desc()).all()


def _calcular_estado(db: Session, reto: Reto, participante: RetoParticipante) -> RetoEstadoOut:
    holdings = db.query(RetoHolding).filter(
        RetoHolding.reto_id == reto.id, RetoHolding.alumno_id == participante.alumno_id
    ).all()

    holdings_out = []
    valor_holdings = Decimal("0")
    for h in holdings:
        if h.cantidad == 0:
            continue
        precio_actual = _precio_reto(reto, h.ticker)
        valor_mercado = precio_actual * h.cantidad
        valor_holdings += valor_mercado
        holdings_out.append(
            RetoHoldingOut(
                ticker=h.ticker,
                cantidad=h.cantidad,
                precio_promedio=h.precio_promedio,
                precio_actual=precio_actual,
                valor_mercado=valor_mercado,
            )
        )

    valor_total = participante.capital_disponible + valor_holdings
    rendimiento_porcentaje = (
        (valor_total - reto.capital_inicial) / reto.capital_inicial * 100 if reto.capital_inicial else Decimal("0")
    )

    ahora = datetime.now(timezone.utc)
    duracion = (reto.fecha_fin - reto.fecha_inicio).total_seconds()
    progreso = (ahora - reto.fecha_inicio).total_seconds() / duracion if duracion > 0 else 1
    progreso = max(0.0, min(1.0, progreso))

    return RetoEstadoOut(
        reto=reto,
        capital_disponible=participante.capital_disponible,
        holdings=holdings_out,
        valor_total=valor_total,
        rendimiento_porcentaje=rendimiento_porcentaje,
        progreso_porcentaje=progreso * 100,
    )


@router.get("/retos/{reto_id}/estado", response_model=RetoEstadoOut)
def estado_reto(reto_id: str, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    reto = db.query(Reto).filter(Reto.id == reto_id).first()
    if not reto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reto no encontrado")
    participante = _participante(db, reto_id, alumno)
    return _calcular_estado(db, reto, participante)


@router.post("/retos/{reto_id}/comprar", response_model=RetoOrdenOut, status_code=status.HTTP_201_CREATED)
def comprar_reto(
    reto_id: str, payload: RetoOrdenCreate, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)
):
    if payload.cantidad <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La cantidad debe ser mayor a cero")

    reto = db.query(Reto).filter(Reto.id == reto_id).first()
    if not reto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reto no encontrado")
    if datetime.now(timezone.utc) >= reto.fecha_fin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este reto ya terminó")

    participante = _participante(db, reto_id, alumno)
    ticker = normalizar_ticker(payload.ticker) if reto.activos_permitidos else payload.ticker.upper().strip()
    if reto.activos_permitidos and ticker not in _activos_lista(reto):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este activo no está permitido en el reto")
    precio = _precio_reto(reto, ticker)
    costo_total = precio * payload.cantidad

    if costo_total > participante.capital_disponible:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Capital disponible insuficiente")

    holding = db.query(RetoHolding).filter(
        RetoHolding.reto_id == reto_id, RetoHolding.alumno_id == alumno.id, RetoHolding.ticker == ticker
    ).first()
    if holding:
        cantidad_total = holding.cantidad + payload.cantidad
        costo_previo = holding.precio_promedio * holding.cantidad
        holding.precio_promedio = (costo_previo + costo_total) / cantidad_total
        holding.cantidad = cantidad_total
    else:
        holding = RetoHolding(
            reto_id=reto_id, alumno_id=alumno.id, ticker=ticker, cantidad=payload.cantidad, precio_promedio=precio
        )
        db.add(holding)

    participante.capital_disponible -= costo_total

    orden = RetoOrden(
        reto_id=reto_id,
        alumno_id=alumno.id,
        ticker=ticker,
        tipo=TipoOrdenRetoEnum.compra,
        cantidad=payload.cantidad,
        precio_ejecucion=precio,
    )
    db.add(orden)
    db.commit()
    db.refresh(orden)
    return orden


@router.post("/retos/{reto_id}/vender", response_model=RetoOrdenOut, status_code=status.HTTP_201_CREATED)
def vender_reto(
    reto_id: str, payload: RetoOrdenCreate, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)
):
    if payload.cantidad <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La cantidad debe ser mayor a cero")

    reto = db.query(Reto).filter(Reto.id == reto_id).first()
    if not reto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reto no encontrado")
    if datetime.now(timezone.utc) >= reto.fecha_fin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este reto ya terminó")

    participante = _participante(db, reto_id, alumno)
    ticker = normalizar_ticker(payload.ticker) if reto.activos_permitidos else payload.ticker.upper().strip()

    holding = db.query(RetoHolding).filter(
        RetoHolding.reto_id == reto_id, RetoHolding.alumno_id == alumno.id, RetoHolding.ticker == ticker
    ).first()
    if not holding or holding.cantidad < payload.cantidad:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No tienes suficientes acciones para vender")

    precio = _precio_reto(reto, ticker)
    monto_total = precio * payload.cantidad

    holding.cantidad -= payload.cantidad
    if holding.cantidad == 0:
        holding.precio_promedio = Decimal("0")

    participante.capital_disponible += monto_total

    orden = RetoOrden(
        reto_id=reto_id,
        alumno_id=alumno.id,
        ticker=ticker,
        tipo=TipoOrdenRetoEnum.venta,
        cantidad=payload.cantidad,
        precio_ejecucion=precio,
    )
    db.add(orden)
    db.commit()
    db.refresh(orden)
    return orden


@router.get("/retos/{reto_id}/ranking", response_model=list[RetoRankingEntry])
def ranking_reto(reto_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reto = db.query(Reto).filter(Reto.id == reto_id).first()
    if not reto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reto no encontrado")

    grupo = db.query(Grupo).filter(Grupo.id == reto.grupo_id).first()
    es_maestro_del_grupo = current_user.rol == RolEnum.maestro and grupo.maestro_id == current_user.id
    participantes = db.query(RetoParticipante).options(joinedload(RetoParticipante.alumno)).filter(
        RetoParticipante.reto_id == reto_id
    ).all()
    es_participante = any(p.alumno_id == current_user.id for p in participantes)
    if not es_maestro_del_grupo and not es_participante:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    entradas = []
    for p in participantes:
        estado = _calcular_estado(db, reto, p)
        entradas.append(
            RetoRankingEntry(
                alumno_id=p.alumno_id,
                nombre=p.alumno.nombre,
                valor_total=estado.valor_total,
                rendimiento_porcentaje=estado.rendimiento_porcentaje,
            )
        )

    entradas.sort(key=lambda e: e.valor_total, reverse=True)

    # Al terminar el reto, otorga la insignia de campeón al primer lugar
    # (siempre que haya operado algo, es decir que su valor difiera del capital).
    if entradas and datetime.now(timezone.utc) >= reto.fecha_fin:
        ganador = entradas[0]
        if ganador.valor_total != reto.capital_inicial:
            if _otorgar(db, ganador.alumno_id, reto.grupo_id, "campeon_reto"):
                db.commit()

    return entradas
