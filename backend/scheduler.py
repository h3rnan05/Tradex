"""
Background scheduler: sweeps pending limit orders and price alerts for ALL students
every 2 minutes, independently of request traffic.
"""
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)


def _sweep():
    try:
        from database import SessionLocal
        from models.orden_pendiente import EstadoOrdenEnum, OrdenPendiente
        from models.alerta import Alerta
        from models.grupo import Grupo
        from models.holding import Holding
        from models.membership import Membership
        from models.orden import Orden, TipoOrdenEnum
        from models.user import User
        from precios_utils import obtener_precio_actual
        from decimal import Decimal
        from datetime import datetime, timezone
        from routers.ordenes import ejecutar_compra

        db = SessionLocal()
        try:
            # ── Limit orders ──────────────────────────────────────────
            pendientes = (
                db.query(OrdenPendiente)
                .filter(OrdenPendiente.estado == EstadoOrdenEnum.pendiente)
                .all()
            )

            tickers_precios: dict[str, Decimal | None] = {}

            for op in pendientes:
                if op.ticker not in tickers_precios:
                    try:
                        tickers_precios[op.ticker] = obtener_precio_actual(op.ticker)
                    except Exception:
                        tickers_precios[op.ticker] = None

                precio_actual = tickers_precios[op.ticker]
                if precio_actual is None:
                    continue

                debe_ejecutar = (
                    (op.tipo == "compra" and precio_actual <= op.precio_limite) or
                    (op.tipo == "venta" and precio_actual >= op.precio_limite)
                )
                if not debe_ejecutar:
                    continue

                try:
                    membership = (
                        db.query(Membership)
                        .with_for_update()
                        .filter(
                            Membership.alumno_id == op.alumno_id,
                            Membership.grupo_id == op.grupo_id,
                        )
                        .first()
                    )
                    grupo = db.query(Grupo).filter(Grupo.id == op.grupo_id).first()
                    alumno = db.query(User).filter(User.id == op.alumno_id).first()
                    if not membership or not grupo or not alumno or membership.pausado:
                        continue

                    if op.tipo == "compra":
                        ejecutar_compra(db, alumno, membership, grupo, op.ticker, op.cantidad)
                    else:
                        holding = (
                            db.query(Holding)
                            .with_for_update()
                            .filter(
                                Holding.alumno_id == op.alumno_id,
                                Holding.grupo_id == op.grupo_id,
                                Holding.ticker == op.ticker,
                            )
                            .first()
                        )
                        if not holding or holding.cantidad < op.cantidad:
                            op.estado = EstadoOrdenEnum.cancelada
                            db.commit()
                            logger.info(
                                "Orden límite venta %s cancelada: holdings insuficientes (alumno=%s ticker=%s)",
                                op.id, op.alumno_id, op.ticker,
                            )
                            continue
                        monto = precio_actual * op.cantidad
                        comision = monto * grupo.comision_porcentaje
                        holding.cantidad -= op.cantidad
                        if holding.cantidad == 0:
                            holding.precio_promedio = Decimal("0")
                        membership.capital_disponible += monto - comision
                        db.add(Orden(
                            alumno_id=op.alumno_id,
                            grupo_id=op.grupo_id,
                            ticker=op.ticker,
                            tipo=TipoOrdenEnum.venta,
                            cantidad=op.cantidad,
                            precio_ejecucion=precio_actual,
                            comision=comision,
                        ))

                    op.estado = EstadoOrdenEnum.ejecutada
                    op.ejecutada_en = datetime.now(timezone.utc)
                    db.commit()
                    logger.info(
                        "Orden límite %s ejecutada (alumno=%s ticker=%s tipo=%s precio=%.4f)",
                        op.id, op.alumno_id, op.ticker, op.tipo, precio_actual,
                    )
                except Exception:
                    db.rollback()
                    logger.exception("Error ejecutando orden límite %s", op.id)
                    # Mark as failed so it doesn't loop forever
                    try:
                        op.estado = EstadoOrdenEnum.cancelada
                        db.commit()
                    except Exception:
                        db.rollback()

            # ── Price alerts ──────────────────────────────────────────
            alertas = (
                db.query(Alerta)
                .filter(Alerta.activa == True, Alerta.disparada == False)
                .all()
            )
            alertas_tickers: dict[str, Decimal | None] = {}
            for alerta in alertas:
                if alerta.ticker not in alertas_tickers:
                    try:
                        alertas_tickers[alerta.ticker] = obtener_precio_actual(alerta.ticker)
                    except Exception:
                        alertas_tickers[alerta.ticker] = None
                precio = alertas_tickers[alerta.ticker]
                if precio is None:
                    continue
                dispara = (
                    (alerta.condicion == "gte" and precio >= alerta.precio_objetivo) or
                    (alerta.condicion == "lte" and precio <= alerta.precio_objetivo)
                )
                if dispara:
                    alerta.disparada = True
                    alerta.disparada_en = datetime.now(timezone.utc)
            db.commit()

        finally:
            db.close()
    except Exception:
        logger.exception("Error en sweep de scheduler")


def start_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(_sweep, IntervalTrigger(minutes=2), id="sweep_ordenes", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler iniciado — barrido de órdenes límite cada 2 minutos")
    return scheduler
