import uuid
from collections import defaultdict
from datetime import date, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from activos_utils import separar_activos_por_disponibilidad
from auth_utils import get_current_user, maestro_owns_alumno
from database import get_db
from models.fase_activo import FaseActivo
from models.holding import Holding
from models.membership import Membership
from models.orden import Orden, TipoOrdenEnum
from models.user import RolEnum, User
from concurrent.futures import ThreadPoolExecutor, as_completed

from precios_utils import obtener_historial_precios_rango, obtener_precio_actual
from schemas.holding import HoldingConPrecio, MisGruposEntry, PortafolioOut
from schemas.orden import OrdenOut
from sqlalchemy.orm import joinedload
from models.grupo import Grupo

router = APIRouter(prefix="/alumnos", tags=["alumnos"])


def _check_alumno_access(db: Session, current_user: User, alumno_id: str) -> None:
    if str(current_user.id) == alumno_id:
        return
    if current_user.rol == RolEnum.maestro and maestro_owns_alumno(db, current_user.id, alumno_id):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")


@router.get("/{alumno_id}/portafolio", response_model=PortafolioOut)
def portafolio(
    alumno_id: str,
    grupo_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_alumno_access(db, current_user, alumno_id)

    q = db.query(Membership).filter(Membership.alumno_id == alumno_id)
    if grupo_id:
        q = q.filter(Membership.grupo_id == grupo_id)
    membership = q.first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El alumno no pertenece a ningun grupo")

    holdings = db.query(Holding).filter(
        Holding.alumno_id == alumno_id, Holding.grupo_id == membership.grupo_id
    ).all()

    holdings_activos = [h for h in holdings if h.cantidad > 0]

    # Fetch all prices in parallel
    tickers_unicos = list({h.ticker for h in holdings_activos})
    precios: dict[str, Decimal] = {}
    if tickers_unicos:
        with ThreadPoolExecutor(max_workers=min(8, len(tickers_unicos))) as ex:
            futuros = {ex.submit(obtener_precio_actual, t): t for t in tickers_unicos}
            for f in as_completed(futuros):
                t = futuros[f]
                try:
                    precios[t] = f.result()
                except Exception:
                    pass

    holdings_con_precio = []
    valor_holdings = Decimal("0")
    prestamo_total = Decimal("0")
    for h in holdings_activos:
        precio_actual = precios.get(h.ticker)
        if precio_actual is None:
            continue
        es_corto = getattr(h, "es_corto", False) or False
        prestamo = getattr(h, "prestamo", None) or Decimal("0")
        notional_entrada = h.precio_promedio * h.cantidad
        if es_corto:
            costo = notional_entrada
            pnl = (h.precio_promedio - precio_actual) * h.cantidad
            pnl_porcentaje = (pnl / costo * 100) if costo else Decimal("0")
            valor_mercado = precio_actual * h.cantidad
            # Colateral comprometido: el préstamo registrado o, para cortos
            # antiguos (anteriores al apalancamiento), el 100% del nocional.
            colateral = prestamo if prestamo > 0 else notional_entrada
            # Aporte al patrimonio: colateral comprometido + P&L del corto.
            valor_holdings += colateral + pnl
            # margen = colateral; apalancamiento = nocional / colateral.
            apalancamiento = (notional_entrada / prestamo) if prestamo else Decimal("1")
        else:
            valor_mercado = precio_actual * h.cantidad
            costo = notional_entrada
            pnl = valor_mercado - costo
            pnl_porcentaje = (pnl / costo * 100) if costo else Decimal("0")
            # Aporte al patrimonio: valor de mercado menos el préstamo (deuda).
            valor_holdings += valor_mercado - prestamo
            # margen propio = nocional - préstamo; apalancamiento = nocional / margen.
            margen = notional_entrada - prestamo
            apalancamiento = (notional_entrada / margen) if margen > 0 else Decimal("1")
        prestamo_total += prestamo
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
                es_corto=es_corto,
                prestamo=prestamo,
                apalancamiento=apalancamiento,
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
        prestamo_total=prestamo_total,
        activos_disponibles=activos_disponibles,
        activos_proximos=activos_proximos,
    )


@router.get("/{alumno_id}/ordenes", response_model=list[OrdenOut])
def historial_ordenes(
    alumno_id: str,
    grupo_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_alumno_access(db, current_user, alumno_id)

    q = db.query(Orden).filter(Orden.alumno_id == alumno_id)
    if grupo_id:
        q = q.filter(Orden.grupo_id == grupo_id)
    return q.order_by(Orden.timestamp.desc()).all()


def _historial_valor_impl(alumno_id: str, grupo_id: str | None, db: Session) -> list:
    """Core portfolio-value-over-time computation. Caller must have verified auth."""
    q = db.query(Membership).filter(Membership.alumno_id == alumno_id)
    if grupo_id:
        q = q.filter(Membership.grupo_id == grupo_id)
    membership = q.first()
    if not membership:
        return []

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

    tickers = list({o.ticker for o in ordenes})
    precios_por_ticker: dict[str, dict[str, Decimal]] = {}
    for ticker in tickers:
        try:
            historial = obtener_historial_precios_rango(ticker, fecha_inicio, fecha_fin)
            precios_por_ticker[ticker] = {p["fecha"]: p["precio"] for p in historial}
        except Exception:
            precios_por_ticker[ticker] = {}

    resultado = []
    capital = capital_inicial
    cantidades: dict[str, Decimal] = defaultdict(Decimal)
    orden_idx = 0

    dia = fecha_inicio
    while dia <= fecha_fin:
        fecha_str = dia.isoformat()

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

        valor_holdings = Decimal("0")
        for ticker, cantidad in cantidades.items():
            if cantidad <= 0:
                continue
            precio_dia = precios_por_ticker.get(ticker, {}).get(fecha_str)
            if precio_dia is None:
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


@router.get("/{alumno_id}/historial-valor")
def historial_valor_portafolio(
    alumno_id: str,
    grupo_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_alumno_access(db, current_user, alumno_id)
    return _historial_valor_impl(alumno_id, grupo_id, db)


@router.get("/{alumno_id}/metricas-riesgo")
def metricas_riesgo(
    alumno_id: uuid.UUID,
    grupo_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from riesgo_utils import calcular_metricas
    from precios_utils import obtener_historial_precios

    _check_alumno_access(db, current_user, str(alumno_id))

    serie = _historial_valor_impl(str(alumno_id), str(grupo_id), db)
    metricas = calcular_metricas(serie)

    try:
        sp_hist = obtener_historial_precios("^GSPC", dias=len(serie) + 10)
        if serie and sp_hist:
            fecha_inicio = serie[0]["fecha"]
            sp_filt = [p for p in sp_hist if p["fecha"] >= fecha_inicio]
            if sp_filt:
                from riesgo_utils import calcular_retornos_diarios
                sp_valores = [p["precio"] for p in sp_filt]
                sp_rendimiento = (sp_valores[-1] - sp_valores[0]) / sp_valores[0] * 100 if len(sp_valores) >= 2 else 0
                metricas["rendimiento_sp500_pct"] = round(sp_rendimiento, 2)
                metricas["alpha"] = round(metricas.get("rendimiento_total_pct", 0) - sp_rendimiento, 2)
    except Exception:
        pass

    return metricas


@router.get("/{alumno_id}/grupos", response_model=list[MisGruposEntry])
def mis_grupos(alumno_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _check_alumno_access(db, current_user, alumno_id)
    memberships = (
        db.query(Membership)
        .options(joinedload(Membership.grupo))
        .filter(Membership.alumno_id == alumno_id)
        .all()
    )
    if not memberships:
        return []

    grupo_ids = [m.grupo_id for m in memberships]
    all_holdings = (
        db.query(Holding)
        .filter(Holding.alumno_id == alumno_id, Holding.grupo_id.in_(grupo_ids), Holding.cantidad > 0)
        .all()
    )

    holdings_by_grupo: dict = defaultdict(list)
    for h in all_holdings:
        holdings_by_grupo[str(h.grupo_id)].append(h)

    tickers = list({h.ticker for h in all_holdings})
    precios: dict[str, Decimal] = {}
    if tickers:
        with ThreadPoolExecutor(max_workers=min(8, len(tickers))) as ex:
            futuros = {ex.submit(obtener_precio_actual, t): t for t in tickers}
            for f in as_completed(futuros):
                t = futuros[f]
                try:
                    precios[t] = f.result()
                except Exception:
                    pass

    result = []
    for m in memberships:
        g = m.grupo
        holdings = holdings_by_grupo.get(str(m.grupo_id), [])
        valor_holdings = sum(
            precios.get(h.ticker, h.precio_promedio) * h.cantidad
            for h in holdings
        )
        valor_total = m.capital_disponible + valor_holdings
        result.append(MisGruposEntry(
            grupo_id=g.id,
            nombre=g.nombre,
            codigo=g.codigo,
            fecha_inicio=g.fecha_inicio,
            fecha_fin=g.fecha_fin,
            capital_inicial=g.capital_inicial,
            capital_disponible=m.capital_disponible,
            valor_total=valor_total,
            pausado=m.pausado,
            activos_permitidos=g.activos_permitidos,
        ))
    return result


@router.delete("/{alumno_id}/grupos/{grupo_id}", status_code=204)
def salir_grupo(alumno_id: str, grupo_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if str(current_user.id) != alumno_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    membership = db.query(Membership).filter(Membership.alumno_id == alumno_id, Membership.grupo_id == grupo_id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="No perteneces a ese grupo")
    db.delete(membership)
    db.commit()
