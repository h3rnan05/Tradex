from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session


from activos_utils import activo_desbloqueado, clasificar_ticker
from models.fase_activo import FaseActivo
from auth_utils import require_alumno
from database import get_db
from models.grupo import Grupo
from models.holding import Holding
from models.membership import Membership
from models.orden import Orden, TipoOrdenEnum
from models.user import User
from precios_utils import obtener_precio_actual, validar_ticker
from schemas.orden import OrdenCreate, OrdenOut

router = APIRouter(prefix="/ordenes", tags=["ordenes"])


def _get_membership(db: Session, alumno: User, grupo_id) -> Membership:
    membership = db.query(Membership).filter(
        Membership.alumno_id == alumno.id, Membership.grupo_id == grupo_id
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No perteneces a ese grupo")
    return membership


def _normalizar_apalancamiento(apalancamiento: Decimal | None) -> Decimal:
    """Acota el apalancamiento al rango permitido (1x–5x)."""
    if apalancamiento is None:
        return Decimal("1")
    lev = Decimal(apalancamiento)
    if lev < 1:
        return Decimal("1")
    if lev > 5:
        return Decimal("5")
    return lev


def ejecutar_compra(
    db: Session, alumno: User, membership: Membership, grupo: Grupo, ticker: str,
    cantidad: Decimal, apalancamiento: Decimal = Decimal("1"),
) -> Orden:
    if cantidad <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La cantidad debe ser mayor a cero")

    lev = _normalizar_apalancamiento(apalancamiento)
    ticker = validar_ticker(ticker)

    tipo_activo = clasificar_ticker(ticker)
    fases_activo = db.query(FaseActivo).filter(FaseActivo.grupo_id == grupo.id).all()
    if not activo_desbloqueado(tipo_activo, grupo.activos_permitidos, fases_activo):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tu grupo no permite operar activos de tipo '{tipo_activo}' todavia",
        )

    precio = obtener_precio_actual(ticker)
    costo_total = precio * cantidad
    comision = costo_total * grupo.comision_porcentaje

    # El apalancamiento solo financia el nocional: el margen requerido es el
    # nocional dividido entre el multiplicador y el resto es efectivo prestado.
    margen = costo_total / lev
    prestamo_nuevo = costo_total - margen

    if grupo.limite_orden_valor is not None and costo_total > grupo.limite_orden_valor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El monto de la orden supera el limite permitido de ${grupo.limite_orden_valor}",
        )

    # Lock the membership row to prevent concurrent orders from overdrawing capital
    membership = (
        db.query(Membership)
        .with_for_update()
        .filter(Membership.id == membership.id)
        .first()
    )

    if margen + comision > membership.capital_disponible:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Capital disponible insuficiente")

    holding = (
        db.query(Holding)
        .with_for_update()
        .filter(Holding.alumno_id == alumno.id, Holding.grupo_id == membership.grupo_id, Holding.ticker == ticker, Holding.es_corto == False)
        .first()
    )

    if holding:
        cantidad_total = holding.cantidad + cantidad
        costo_previo = holding.precio_promedio * holding.cantidad
        holding.precio_promedio = (costo_previo + costo_total) / cantidad_total
        holding.cantidad = cantidad_total
        holding.prestamo = (holding.prestamo or Decimal("0")) + prestamo_nuevo
    else:
        holding = Holding(
            alumno_id=alumno.id,
            grupo_id=membership.grupo_id,
            ticker=ticker,
            cantidad=cantidad,
            precio_promedio=precio,
            prestamo=prestamo_nuevo,
        )
        db.add(holding)

    membership.capital_disponible -= margen + comision

    orden = Orden(
        alumno_id=alumno.id,
        grupo_id=membership.grupo_id,
        ticker=ticker,
        tipo=TipoOrdenEnum.compra,
        cantidad=cantidad,
        precio_ejecucion=precio,
        comision=comision,
    )
    db.add(orden)
    return orden


@router.post("/compra", response_model=OrdenOut, status_code=status.HTTP_201_CREATED)
def comprar(payload: OrdenCreate, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    membership = _get_membership(db, alumno, payload.grupo_id)
    if membership.pausado:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tu participación está pausada")
    grupo = db.query(Grupo).filter(Grupo.id == payload.grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")

    orden = ejecutar_compra(db, alumno, membership, grupo, payload.ticker, payload.cantidad, payload.apalancamiento)
    db.commit()
    db.refresh(orden)
    try:
        from insignias_engine import evaluar_y_otorgar_insignias
        evaluar_y_otorgar_insignias(db, alumno.id, payload.grupo_id, capital_inicial=float(grupo.capital_inicial))
    except Exception:
        pass
    return orden


@router.post("/venta", response_model=OrdenOut, status_code=status.HTTP_201_CREATED)
def vender(payload: OrdenCreate, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    if payload.cantidad <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La cantidad debe ser mayor a cero")

    membership = _get_membership(db, alumno, payload.grupo_id)
    if membership.pausado:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tu participación está pausada")
    grupo = db.query(Grupo).filter(Grupo.id == payload.grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")
    ticker = validar_ticker(payload.ticker)

    # Lock both rows to prevent concurrent sells from going negative
    holding = (
        db.query(Holding)
        .with_for_update()
        .filter(Holding.alumno_id == alumno.id, Holding.grupo_id == payload.grupo_id, Holding.ticker == ticker, Holding.es_corto == False)
        .first()
    )
    membership = (
        db.query(Membership)
        .with_for_update()
        .filter(Membership.id == membership.id)
        .first()
    )

    if not holding or holding.cantidad < payload.cantidad:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No tienes suficientes acciones para vender")

    precio = obtener_precio_actual(ticker)
    monto_total = precio * payload.cantidad
    comision = monto_total * grupo.comision_porcentaje

    # Al vender se devuelve la parte del préstamo proporcional a las acciones
    # vendidas; el resto del producto (margen + P&L) regresa al efectivo.
    prestamo_actual = holding.prestamo or Decimal("0")
    prestamo_a_pagar = prestamo_actual * (payload.cantidad / holding.cantidad)

    holding.cantidad -= payload.cantidad
    holding.prestamo = prestamo_actual - prestamo_a_pagar
    if holding.cantidad == 0:
        holding.precio_promedio = Decimal("0")
        holding.prestamo = Decimal("0")

    membership.capital_disponible += monto_total - prestamo_a_pagar - comision

    orden = Orden(
        alumno_id=alumno.id,
        grupo_id=payload.grupo_id,
        ticker=ticker,
        tipo=TipoOrdenEnum.venta,
        cantidad=payload.cantidad,
        precio_ejecucion=precio,
        comision=comision,
    )
    db.add(orden)
    db.commit()
    db.refresh(orden)
    try:
        from insignias_engine import evaluar_y_otorgar_insignias
        evaluar_y_otorgar_insignias(db, alumno.id, payload.grupo_id, capital_inicial=float(grupo.capital_inicial))
    except Exception:
        pass
    return orden


@router.post("/short", response_model=OrdenOut, status_code=status.HTTP_201_CREATED)
def abrir_corto(payload: OrdenCreate, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    """Open a short position: borrow and sell shares, hold the proceeds as collateral."""
    if payload.cantidad <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La cantidad debe ser mayor a cero")

    membership = _get_membership(db, alumno, payload.grupo_id)
    if membership.pausado:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tu participación está pausada")

    grupo = db.query(Grupo).filter(Grupo.id == payload.grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")

    lev = _normalizar_apalancamiento(payload.apalancamiento)
    ticker = validar_ticker(payload.ticker)
    precio = obtener_precio_actual(ticker)
    valor_posicion = precio * payload.cantidad
    comision = valor_posicion * grupo.comision_porcentaje

    # Colateral requerido = nocional / apalancamiento (100% del valor a 1x).
    colateral = valor_posicion / lev

    membership = db.query(Membership).with_for_update().filter(Membership.id == membership.id).first()
    if colateral + comision > membership.capital_disponible:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Capital insuficiente para abrir la posición corta")

    holding_corto = (
        db.query(Holding).with_for_update()
        .filter(Holding.alumno_id == alumno.id, Holding.grupo_id == membership.grupo_id,
                Holding.ticker == ticker, Holding.es_corto == True)
        .first()
    )
    if holding_corto:
        total_cant = holding_corto.cantidad + payload.cantidad
        costo_previo = holding_corto.precio_promedio * holding_corto.cantidad
        holding_corto.precio_promedio = (costo_previo + valor_posicion) / total_cant
        holding_corto.cantidad = total_cant
        holding_corto.prestamo = (holding_corto.prestamo or Decimal("0")) + colateral
    else:
        holding_corto = Holding(
            alumno_id=alumno.id, grupo_id=membership.grupo_id,
            ticker=ticker, cantidad=payload.cantidad,
            precio_promedio=precio, es_corto=True, prestamo=colateral,
        )
        db.add(holding_corto)

    membership.capital_disponible -= colateral + comision

    orden = Orden(
        alumno_id=alumno.id, grupo_id=membership.grupo_id,
        ticker=ticker, tipo=TipoOrdenEnum.venta,
        cantidad=payload.cantidad, precio_ejecucion=precio, comision=comision,
    )
    db.add(orden)
    db.commit()
    db.refresh(orden)
    return orden


@router.post("/cubrir", response_model=OrdenOut, status_code=status.HTTP_201_CREATED)
def cubrir_corto(payload: OrdenCreate, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    """Cover (close) a short position: buy back shares."""
    if payload.cantidad <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La cantidad debe ser mayor a cero")

    membership = _get_membership(db, alumno, payload.grupo_id)
    if membership.pausado:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tu participación está pausada")

    grupo = db.query(Grupo).filter(Grupo.id == payload.grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")

    ticker = validar_ticker(payload.ticker)

    holding_corto = (
        db.query(Holding).with_for_update()
        .filter(Holding.alumno_id == alumno.id, Holding.grupo_id == payload.grupo_id,
                Holding.ticker == ticker, Holding.es_corto == True)
        .first()
    )
    membership = db.query(Membership).with_for_update().filter(Membership.id == membership.id).first()

    if not holding_corto or holding_corto.cantidad < payload.cantidad:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No tienes suficientes acciones en corto para cubrir")

    precio_actual = obtener_precio_actual(ticker)
    comision = precio_actual * payload.cantidad * grupo.comision_porcentaje

    precio_entrada = holding_corto.precio_promedio
    # Se libera el colateral proporcional a las acciones cubiertas más el P&L.
    prestamo_actual = holding_corto.prestamo or Decimal("0")
    colateral_liberado = prestamo_actual * (payload.cantidad / holding_corto.cantidad)
    pnl = (precio_entrada - precio_actual) * payload.cantidad

    devolucion = colateral_liberado + pnl - comision
    membership.capital_disponible += devolucion

    holding_corto.cantidad -= payload.cantidad
    holding_corto.prestamo = prestamo_actual - colateral_liberado
    if holding_corto.cantidad == 0:
        holding_corto.precio_promedio = Decimal("0")
        holding_corto.prestamo = Decimal("0")

    orden = Orden(
        alumno_id=alumno.id, grupo_id=payload.grupo_id,
        ticker=ticker, tipo=TipoOrdenEnum.compra,
        cantidad=payload.cantidad, precio_ejecucion=precio_actual, comision=comision,
    )
    db.add(orden)
    db.commit()
    db.refresh(orden)
    return orden
