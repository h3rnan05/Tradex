from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from auth_utils import get_current_user, require_alumno, require_maestro
from database import get_db
from escenarios_historicos import (
    NOTICIERO,
    _progreso,
    noticias_escenario,
    obtener_escenario,
    precio_simulado,
    precio_y_cambio_simulado,
    serie_simulada,
)
from insignias_engine import _otorgar
from models.grupo import Grupo
from models.membership import Membership
from models.reto import Reto, RetoHolding, RetoOrden, RetoParticipante, TipoOrdenRetoEnum
from models.user import RolEnum, User
from precios_utils import normalizar_ticker, obtener_precio_actual
from progreso_engine import calcular_comision, calcular_nivel, calcular_progreso
from schemas.reto import (
    RetoCreate,
    RetoEstadoOut,
    RetoHoldingOut,
    RetoMercadoEntry,
    RetoNoticiasOut,
    RetoOrdenCreate,
    RetoOrdenOut,
    RetoOut,
    RetoParticipanteResumen,
    RetoRankingEntry,
)

router = APIRouter(tags=["retos"])


def _grupo_del_maestro(db: Session, grupo_id: str, maestro: User) -> Grupo:
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id, Grupo.maestro_id == maestro.id).first()
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")
    return grupo


def _norm_lev(apalancamiento: Decimal | None) -> Decimal:
    """Acota el apalancamiento al rango permitido (1x–5x)."""
    if apalancamiento is None:
        return Decimal("1")
    lev = Decimal(apalancamiento)
    if lev < 1:
        return Decimal("1")
    if lev > 5:
        return Decimal("5")
    return lev


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


def _notional_cortos(db: Session, reto: Reto, alumno_id, excluir_ticker: str) -> Decimal:
    """Suma del valor nocional de todas las posiciones en corto del alumno
    (excepto la que se está modificando). Sirve para limitar el apalancamiento."""
    holdings = db.query(RetoHolding).filter(
        RetoHolding.reto_id == reto.id, RetoHolding.alumno_id == alumno_id
    ).all()
    total = Decimal("0")
    for h in holdings:
        if h.ticker == excluir_ticker or h.cantidad >= 0:
            continue
        try:
            precio = _precio_reto(reto, h.ticker)
        except Exception:
            precio = h.precio_promedio
        total += abs(h.cantidad) * precio
    return total


def _nuevo_promedio(q: Decimal, avg: Decimal, signed: Decimal, precio: Decimal, nuevo_q: Decimal) -> Decimal:
    """Precio promedio de entrada tras aplicar una operación, válido para
    posiciones largas y cortas."""
    if nuevo_q == 0:
        return Decimal("0")
    # Abrir posición o aumentar en la misma dirección: promedio ponderado.
    if q == 0 or (q > 0) == (signed > 0):
        return (avg * abs(q) + precio * abs(signed)) / abs(nuevo_q)
    # Reducir sin cambiar de lado: se conserva el promedio.
    if (nuevo_q > 0) == (q > 0):
        return avg
    # Invierte de largo a corto (o viceversa): el residuo abre al precio actual.
    return precio


def _ejecutar_operacion(
    db: Session, reto: Reto, participante: RetoParticipante, ticker: str, cantidad: Decimal,
    precio: Decimal, es_compra: bool, apalancamiento: Decimal = Decimal("1"),
    comision_base: int = 1,
) -> None:
    """Aplica una compra o venta al portafolio del reto. Permite ventas en corto
    (la posición puede quedar negativa) con un tope de margen de 1x el capital
    inicial (escalado por el apalancamiento).

    Apalancamiento (1x–5x): para las posiciones largas solo se exige como margen
    el nocional dividido entre el multiplicador y el resto se registra como
    préstamo (`holding.prestamo`), que se devuelve proporcionalmente al cerrar.
    Las ventas en corto usan el modelo de ingresos en efectivo, así que el
    apalancamiento solo amplía su límite de margen.
    """
    lev = _norm_lev(apalancamiento)
    signed = cantidad if es_compra else -cantidad
    holding = db.query(RetoHolding).filter(
        RetoHolding.reto_id == reto.id, RetoHolding.alumno_id == participante.alumno_id, RetoHolding.ticker == ticker
    ).first()
    q = holding.cantidad if holding else Decimal("0")
    avg = holding.precio_promedio if holding else Decimal("0")
    prestamo = (holding.prestamo if holding else Decimal("0")) or Decimal("0")
    nuevo_q = q + signed

    # Separa la operación en la parte que reduce la posición existente (lado
    # opuesto) y la parte que abre/amplía exposición en el lado resultante.
    if q == 0 or (q > 0) == (signed > 0):
        reduce = Decimal("0")
    else:
        reduce = min(abs(signed), abs(q))
    abrir = abs(signed) - reduce

    cap = participante.capital_disponible

    # 1) Cerrar (parcialmente) la posición existente.
    if reduce > 0:
        if q > 0:
            # Vender un largo: devuelve el préstamo proporcional + producto.
            frac = reduce / abs(q)
            prestamo_liberado = prestamo * frac
            cap += precio * reduce - prestamo_liberado
            prestamo -= prestamo_liberado
        else:
            # Cubrir un corto: recompra al precio actual (modelo de efectivo).
            cap -= precio * reduce

    # 2) Abrir/ampliar exposición en el lado resultante.
    if abrir > 0:
        if nuevo_q > 0:
            # Largo apalancado: solo se exige el margen; el resto es préstamo.
            costo = precio * abrir
            margen = costo / lev
            if margen > cap:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Capital disponible insuficiente")
            cap -= margen
            prestamo += costo - margen
        else:
            # Corto: ingresa el efectivo y revisa el tope de margen (×lev).
            notional = _notional_cortos(db, reto, participante.alumno_id, ticker) + abs(nuevo_q) * precio
            if notional > reto.capital_inicial * lev:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Superas el límite de margen para ventas en corto",
                )
            cap += precio * abrir

    nuevo_avg = _nuevo_promedio(q, avg, signed, precio, nuevo_q)
    if nuevo_q == 0:
        prestamo = Decimal("0")
    # Una pérdida catastrófica (p. ej. cubrir un corto en plena subida) no puede
    # dejar el efectivo negativo: el alumno pierde como máximo su capital.
    participante.capital_disponible = cap if cap > 0 else Decimal("0")

    # Apply level-based commission on the notional of the operation.
    notional = precio * cantidad
    progreso = calcular_progreso(db, participante.alumno_id, reto.grupo_id)
    nivel = progreso["nivel"]
    comision_rate = Decimal(str(calcular_comision(comision_base, nivel)))
    comision_monto = notional * comision_rate
    nuevo_cap = participante.capital_disponible - comision_monto
    participante.capital_disponible = nuevo_cap if nuevo_cap > 0 else Decimal("0")

    if holding:
        holding.cantidad = nuevo_q
        holding.precio_promedio = nuevo_avg
        holding.prestamo = prestamo
    else:
        db.add(RetoHolding(
            reto_id=reto.id, alumno_id=participante.alumno_id, ticker=ticker,
            cantidad=nuevo_q, precio_promedio=nuevo_avg, prestamo=prestamo,
        ))


def _participante(db: Session, reto: Reto, alumno: User) -> RetoParticipante:
    participante = db.query(RetoParticipante).filter(
        RetoParticipante.reto_id == reto.id, RetoParticipante.alumno_id == alumno.id
    ).first()
    if participante:
        return participante
    # Inscripción al vuelo: si el alumno es miembro del grupo pero se unió
    # después de crear el reto, lo damos de alta con el capital inicial.
    es_miembro = db.query(Membership).filter(
        Membership.grupo_id == reto.grupo_id, Membership.alumno_id == alumno.id
    ).first()
    if not es_miembro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No participas en este reto")
    participante = RetoParticipante(
        reto_id=reto.id, alumno_id=alumno.id, capital_disponible=reto.capital_inicial
    )
    db.add(participante)
    db.flush()
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


@router.get("/retos/activo", response_model=RetoOut | None)
def reto_activo(db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    """Reto en curso del alumno (ya empezó y no ha terminado) en cualquiera de
    sus grupos. Si hay varios, devuelve el que termina primero. Sirve para que
    la interfaz del alumno entre en 'modo reto' automáticamente."""
    ahora = datetime.now(timezone.utc)
    grupo_ids = [
        m.grupo_id for m in db.query(Membership).filter(Membership.alumno_id == alumno.id).all()
    ]
    if not grupo_ids:
        return None
    reto = (
        db.query(Reto)
        .filter(
            Reto.grupo_id.in_(grupo_ids),
            Reto.fecha_inicio <= ahora,
            Reto.fecha_fin > ahora,
        )
        .order_by(Reto.fecha_fin.asc())
        .first()
    )
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


@router.get("/retos/{reto_id}", response_model=RetoOut)
def detalle_reto(reto_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reto = db.query(Reto).filter(Reto.id == reto_id).first()
    if not reto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reto no encontrado")

    grupo = db.query(Grupo).filter(Grupo.id == reto.grupo_id).first()
    es_maestro_del_grupo = current_user.rol == RolEnum.maestro and grupo and grupo.maestro_id == current_user.id
    es_alumno_del_grupo = db.query(Membership).filter(
        Membership.grupo_id == reto.grupo_id, Membership.alumno_id == current_user.id
    ).first()
    if not es_maestro_del_grupo and not es_alumno_del_grupo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    return reto


def _calcular_estado(db: Session, reto: Reto, participante: RetoParticipante) -> RetoEstadoOut:
    holdings = db.query(RetoHolding).filter(
        RetoHolding.reto_id == reto.id, RetoHolding.alumno_id == participante.alumno_id
    ).all()

    holdings_out = []
    valor_holdings = Decimal("0")
    prestamo_total = Decimal("0")
    for h in holdings:
        if h.cantidad == 0:
            continue
        try:
            precio_actual = _precio_reto(reto, h.ticker)
        except Exception:
            # Si no hay precio disponible para este activo, valoramos al costo
            # promedio para no romper el cálculo del portafolio del reto.
            precio_actual = h.precio_promedio
        valor_mercado = precio_actual * h.cantidad
        valor_holdings += valor_mercado
        prestamo = (getattr(h, "prestamo", None) or Decimal("0"))
        prestamo_total += prestamo
        # Apalancamiento de la posición larga: nocional / margen propio.
        notional_entrada = h.precio_promedio * h.cantidad
        margen = notional_entrada - prestamo
        apalancamiento = (notional_entrada / margen) if (h.cantidad > 0 and margen > 0) else Decimal("1")
        holdings_out.append(
            RetoHoldingOut(
                ticker=h.ticker,
                cantidad=h.cantidad,
                precio_promedio=h.precio_promedio,
                precio_actual=precio_actual,
                valor_mercado=valor_mercado,
                prestamo=prestamo,
                apalancamiento=apalancamiento,
            )
        )

    # El préstamo (parte apalancada de los largos) es deuda: se resta al patrimonio.
    valor_total = participante.capital_disponible + valor_holdings - prestamo_total
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
        prestamo_total=prestamo_total,
    )


@router.get("/retos/{reto_id}/estado", response_model=RetoEstadoOut)
def estado_reto(reto_id: str, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    reto = db.query(Reto).filter(Reto.id == reto_id).first()
    if not reto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reto no encontrado")
    participante = _participante(db, reto, alumno)
    estado = _calcular_estado(db, reto, participante)
    db.commit()
    return estado


@router.get("/retos/{reto_id}/ordenes", response_model=list[RetoOrdenOut])
def ordenes_reto(reto_id: str, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    """Historial de órdenes del alumno dentro del reto."""
    reto = db.query(Reto).filter(Reto.id == reto_id).first()
    if not reto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reto no encontrado")
    return (
        db.query(RetoOrden)
        .filter(RetoOrden.reto_id == reto_id, RetoOrden.alumno_id == alumno.id)
        .order_by(RetoOrden.timestamp.desc())
        .all()
    )


@router.get("/retos/{reto_id}/mercado", response_model=list[RetoMercadoEntry])
def mercado_reto(reto_id: str, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    """Estado del mercado dentro del reto: para cada activo operable devuelve su
    precio actual y la variacion acumulada desde el inicio. Alimenta el ticker
    inmersivo que tiñe la pantalla de rojo cuando el escenario es una crisis."""
    reto = db.query(Reto).filter(Reto.id == reto_id).first()
    if not reto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reto no encontrado")
    _participante(db, reto, alumno)

    entradas: list[RetoMercadoEntry] = []
    if reto.activos_permitidos:
        for ticker in _activos_lista(reto):
            try:
                precio = obtener_precio_actual(ticker)
            except Exception:
                continue
            entradas.append(RetoMercadoEntry(ticker=ticker, precio=precio, cambio_porcentaje=0.0))
    elif reto.escenario_id:
        escenario = obtener_escenario(reto.escenario_id)
        for ticker in escenario["tickers_sugeridos"]:
            try:
                precio, cambio, cambio_total = precio_y_cambio_simulado(
                    ticker, reto.escenario_id, reto.fecha_inicio, reto.fecha_fin
                )
            except Exception:
                continue
            entradas.append(RetoMercadoEntry(ticker=ticker, precio=precio, cambio_porcentaje=cambio, cambio_total=cambio_total))
    db.commit()
    return entradas


@router.get("/retos/{reto_id}/serie", response_model=list[float])
def serie_reto(reto_id: str, ticker: str, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    """Serie de precios revelada hasta ahora para graficar el activo en el reto.
    Solo aplica a retos de escenario histórico."""
    reto = db.query(Reto).filter(Reto.id == reto_id).first()
    if not reto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reto no encontrado")
    _participante(db, reto, alumno)
    db.commit()
    if not reto.escenario_id:
        return []
    return serie_simulada(ticker, reto.escenario_id, reto.fecha_inicio, reto.fecha_fin)


@router.get("/retos/{reto_id}/noticias", response_model=RetoNoticiasOut)
def noticias_reto(reto_id: str, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    """Titulares del periódico ficticio que narra el escenario, desbloqueados
    según el avance del reto. Da contexto e inmersión a la crisis."""
    reto = db.query(Reto).filter(Reto.id == reto_id).first()
    if not reto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reto no encontrado")
    _participante(db, reto, alumno)
    if not reto.escenario_id:
        return RetoNoticiasOut(periodico=NOTICIERO, noticias=[])
    db.commit()
    progreso = _progreso(reto.fecha_inicio, reto.fecha_fin)
    return RetoNoticiasOut(periodico=NOTICIERO, noticias=noticias_escenario(reto.escenario_id, progreso))


@router.post("/retos/{reto_id}/comprar", response_model=RetoOrdenOut, status_code=status.HTTP_201_CREATED)
def comprar_reto(
    reto_id: str, payload: RetoOrdenCreate, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)
):
    if payload.cantidad <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La cantidad debe ser mayor a cero")

    reto = db.query(Reto).filter(Reto.id == reto_id).first()
    if not reto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reto no encontrado")
    ahora = datetime.now(timezone.utc)
    if ahora < reto.fecha_inicio:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este reto aún no comienza")
    if ahora >= reto.fecha_fin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este reto ya terminó")

    participante = _participante(db, reto, alumno)
    ticker = normalizar_ticker(payload.ticker) if reto.activos_permitidos else payload.ticker.upper().strip()
    if reto.activos_permitidos and ticker not in _activos_lista(reto):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este activo no está permitido en el reto")
    precio = _precio_reto(reto, ticker)

    grupo = db.query(Grupo).filter(Grupo.id == reto.grupo_id).first()
    _comision_base = (getattr(grupo, "comision_base", 1) or 1) if grupo else 1
    _ejecutar_operacion(db, reto, participante, ticker, payload.cantidad, precio, es_compra=True, apalancamiento=payload.apalancamiento, comision_base=_comision_base)

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
    ahora = datetime.now(timezone.utc)
    if ahora < reto.fecha_inicio:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este reto aún no comienza")
    if ahora >= reto.fecha_fin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este reto ya terminó")

    participante = _participante(db, reto, alumno)
    ticker = normalizar_ticker(payload.ticker) if reto.activos_permitidos else payload.ticker.upper().strip()
    if reto.activos_permitidos and ticker not in _activos_lista(reto):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este activo no está permitido en el reto")
    precio = _precio_reto(reto, ticker)

    grupo = db.query(Grupo).filter(Grupo.id == reto.grupo_id).first()
    _comision_base = (getattr(grupo, "comision_base", 1) or 1) if grupo else 1
    _ejecutar_operacion(db, reto, participante, ticker, payload.cantidad, precio, es_compra=False, apalancamiento=payload.apalancamiento, comision_base=_comision_base)

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


@router.post("/retos/{reto_id}/liquidar", response_model=RetoEstadoOut)
def liquidar_reto(
    reto_id: str, ticker: str | None = None, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)
):
    """Cierra posiciones del alumno al precio actual: vende los largos y cubre
    los cortos. Sin `ticker` cierra todo; con `ticker` cierra solo ese activo.
    Liquidación forzada (no aplica el guard de capital, como un margin call)."""
    reto = db.query(Reto).filter(Reto.id == reto_id).first()
    if not reto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reto no encontrado")
    ahora = datetime.now(timezone.utc)
    if ahora < reto.fecha_inicio:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este reto aún no comienza")
    if ahora >= reto.fecha_fin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este reto ya terminó")

    participante = _participante(db, reto, alumno)
    query = db.query(RetoHolding).filter(
        RetoHolding.reto_id == reto_id, RetoHolding.alumno_id == alumno.id
    )
    if ticker:
        query = query.filter(RetoHolding.ticker == ticker)
    holdings = query.all()

    for h in holdings:
        if h.cantidad == 0:
            continue
        try:
            precio = _precio_reto(reto, h.ticker)
        except Exception:
            precio = h.precio_promedio
        cantidad = abs(h.cantidad)
        es_compra = h.cantidad < 0  # los cortos se cierran comprando (cubrir)
        prestamo = (getattr(h, "prestamo", None) or Decimal("0"))
        if es_compra:
            # Cubrir un corto: recompra al precio actual (modelo de efectivo).
            participante.capital_disponible -= precio * cantidad
        else:
            # Vender un largo: producto menos el préstamo (deuda) a devolver.
            participante.capital_disponible += precio * cantidad - prestamo
        h.cantidad = Decimal("0")
        h.precio_promedio = Decimal("0")
        h.prestamo = Decimal("0")
        db.add(RetoOrden(
            reto_id=reto_id,
            alumno_id=alumno.id,
            ticker=h.ticker,
            tipo=TipoOrdenRetoEnum.compra if es_compra else TipoOrdenRetoEnum.venta,
            cantidad=cantidad,
            precio_ejecucion=precio,
        ))

    estado = _calcular_estado(db, reto, participante)
    db.commit()
    return estado


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
    es_miembro = db.query(Membership).filter(
        Membership.grupo_id == reto.grupo_id, Membership.alumno_id == current_user.id
    ).first()
    if not es_maestro_del_grupo and not es_miembro:
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


@router.post("/retos/{reto_id}/pausar", response_model=RetoOut)
def pausar_reto(reto_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_maestro)):
    reto = db.query(Reto).filter(Reto.id == reto_id).first()
    if not reto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reto no encontrado")
    grupo = db.query(Grupo).filter(Grupo.id == reto.grupo_id).first()
    if grupo.maestro_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    reto.pausado = True
    db.commit()
    db.refresh(reto)
    return reto


@router.post("/retos/{reto_id}/reanudar", response_model=RetoOut)
def reanudar_reto(reto_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_maestro)):
    reto = db.query(Reto).filter(Reto.id == reto_id).first()
    if not reto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reto no encontrado")
    grupo = db.query(Grupo).filter(Grupo.id == reto.grupo_id).first()
    if grupo.maestro_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
    reto.pausado = False
    db.commit()
    db.refresh(reto)
    return reto


@router.get("/retos/{reto_id}/participantes-resumen", response_model=list[RetoParticipanteResumen])
def resumen_participantes(reto_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_maestro)):
    reto = db.query(Reto).filter(Reto.id == reto_id).first()
    if not reto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reto no encontrado")
    grupo = db.query(Grupo).filter(Grupo.id == reto.grupo_id).first()
    if grupo.maestro_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    participantes = db.query(RetoParticipante).options(joinedload(RetoParticipante.alumno)).filter(
        RetoParticipante.reto_id == reto_id
    ).all()

    resultado = []
    for p in participantes:
        n_ops = db.query(RetoOrden).filter(
            RetoOrden.reto_id == reto_id, RetoOrden.alumno_id == p.alumno_id
        ).count()
        estado = _calcular_estado(db, reto, p)
        pnl = (estado.valor_total - reto.capital_inicial) / reto.capital_inicial * 100
        resultado.append(RetoParticipanteResumen(
            alumno_id=p.alumno_id,
            nombre=p.alumno.nombre,
            capital_disponible=p.capital_disponible,
            valor_total=estado.valor_total,
            n_operaciones=n_ops,
            pnl_pct=pnl,
        ))

    resultado.sort(key=lambda r: r.valor_total, reverse=True)
    return resultado


@router.get("/maestro/retos", response_model=list[RetoOut])
def listar_retos_maestro(db: Session = Depends(get_db), current_user: User = Depends(require_maestro)):
    grupos = db.query(Grupo).filter(Grupo.maestro_id == current_user.id).all()
    grupo_ids = [g.id for g in grupos]
    retos = db.query(Reto).filter(Reto.grupo_id.in_(grupo_ids)).order_by(Reto.fecha_inicio.desc()).all()
    return retos
