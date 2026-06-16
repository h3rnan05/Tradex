from collections import defaultdict
from datetime import date, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from activos_utils import separar_activos_por_disponibilidad
from auth_utils import get_current_user
from database import get_db
from models.fase_activo import FaseActivo
from models.holding import Holding
from models.membership import Membership
from models.orden import Orden, TipoOrdenEnum
from models.user import RolEnum, User
from precios_utils import obtener_historial_precios_rango, obtener_precio_actual
from schemas.holding import HoldingConPrecio, PortafolioOut
from schemas.orden import OrdenOut

router = APIRouter(prefix="/alumnos", tags=["alumnos"])


@router.get("/{alumno_id}/portafolio", response_model=PortafolioOut)
def portafolio(alumno_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if str(current_user.id) != alumno_id and current_user.rol != RolEnum.maestro:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    membership = db.query(Membership).filter(Membership.alumno_id == alumno_id).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El alumno no pertenece a ningun grupo")

    holdings = db.query(Holding).filter(
        Holding.alumno_id == alumno_id, Holding.grupo_id == membership.grupo_id
    ).all()

    holdings_con_precio = []
    valor_holdings = Decimal("0")
    for h in holdings:
        if h.cantidad == 0:
            continue
        precio_actual = obtener_precio_actual(h.ticker)
        valor_mercado = precio_actual * h.cantidad
        costo = h.precio_promedio * h.cantidad
        pnl = valor_mercado - costo
        pnl_porcentaje = (pnl / costo * 100) if costo else Decimal("0")
        valor_holdings += valor_mercado
        holdings_con_precio.append(
            HoldingConPrecio(
                id=h.id,
                alumno_id=h.alumno_id,
                grupo_id=h.grupo_id,
                ticker=h.ticker,
                cantidad=h.cantidad,
                precio_promedio=h.precio_promedio,
                precio_actual=precio_actual,
                valor_mercado=valor_mercado,
                pnl=pnl,
                pnl_porcentaje=pnl_porcentaje,
            )
        )

    capital_inicial = membership.grupo.capital_inicial
    valor_total = membership.capital_disponible + valor_holdings
    rendimiento = valor_total - capital_inicial
    rendimiento_porcentaje = (rendimiento / capital_inicial * 100) if capital_inicial else Decimal("0")

    fases_activo = db.query(FaseActivo).filter(FaseActivo.grupo_id == membership.grupo_id).all()
    activos_disponibles, activos_proximos = separar_activos_por_disponibilidad(
        membership.grupo.activos_permitidos, fases_activo
    )

    return PortafolioOut(
        grupo_id=membership.grupo_id,
        capital_disponible=membership.capital_disponible,
        capital_inicial=capital_inicial,
        holdings=holdings_con_precio,
        valor_total=valor_total,
        rendimiento=rendimiento,
        rendimiento_porcentaje=rendimiento_porcentaje,
        activos_disponibles=activos_disponibles,
        activos_proximos=activos_proximos,
    )


@router.get("/{alumno_id}/ordenes", response_model=list[OrdenOut])
def historial_ordenes(alumno_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if str(current_user.id) != alumno_id and current_user.rol != RolEnum.maestro:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    return (
        db.query(Orden)
        .filter(Orden.alumno_id == alumno_id)
        .order_by(Orden.timestamp.desc())
        .all()
    )


@router.get("/{alumno_id}/historial-valor")
def historial_valor_portafolio(
    alumno_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if str(current_user.id) != alumno_id and current_user.rol != RolEnum.maestro:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    membership = db.query(Membership).filter(Membership.alumno_id == alumno_id).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El alumno no pertenece a ningun grupo")

    ordenes = (
        db.query(Orden)
        .filter(Orden.alumno_id == alumno_id, Orden.grupo_id == membership.grupo_id)
        .order_by(Orden.timestamp.asc())
        .all()
    )

    if not ordenes:
        return []

    capital_inicial = membership.grupo.capital_inicial
    fecha_inicio = ordenes[0].timestamp.astimezone(timezone.utc).date()
    fecha_fin = date.today()

    # Collect all tickers and fetch their price history once
    tickers = list({o.ticker for o in ordenes})
    precios_por_ticker: dict[str, dict[str, Decimal]] = {}
    for ticker in tickers:
        try:
            historial = obtener_historial_precios_rango(ticker, fecha_inicio, fecha_fin)
            precios_por_ticker[ticker] = {p["fecha"]: p["precio"] for p in historial}
        except Exception:
            precios_por_ticker[ticker] = {}

    # Build day-by-day portfolio value
    resultado = []
    capital = capital_inicial
    cantidades: dict[str, Decimal] = defaultdict(Decimal)
    orden_idx = 0

    dia = fecha_inicio
    while dia <= fecha_fin:
        fecha_str = dia.isoformat()

        # Apply all orders that happened on or before this day
        while orden_idx < len(ordenes):
            o = ordenes[orden_idx]
            o_fecha = o.timestamp.astimezone(timezone.utc).date()
            if o_fecha > dia:
                break
            costo = o.precio_ejecucion * o.cantidad + o.comision
            if o.tipo == TipoOrdenEnum.compra:
                capital -= costo
                cantidades[o.ticker] += o.cantidad
            else:
                capital += o.precio_ejecucion * o.cantidad - o.comision
                cantidades[o.ticker] -= o.cantidad
            orden_idx += 1

        # Calculate portfolio value using nearest available price for each ticker
        valor_holdings = Decimal("0")
        for ticker, cantidad in cantidades.items():
            if cantidad <= 0:
                continue
            precio_dia = precios_por_ticker.get(ticker, {}).get(fecha_str)
            if precio_dia is None:
                # fallback: use most recent available price up to today
                precios_ticker = precios_por_ticker.get(ticker, {})
                fechas_disponibles = sorted(f for f in precios_ticker if f <= fecha_str)
                if fechas_disponibles:
                    precio_dia = precios_ticker[fechas_disponibles[-1]]
            if precio_dia:
                valor_holdings += precio_dia * cantidad

        valor_total = capital + valor_holdings
        resultado.append({"fecha": fecha_str, "valor": float(valor_total)})
        dia += timedelta(days=1)

    return resultado
