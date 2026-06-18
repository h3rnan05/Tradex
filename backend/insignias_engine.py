import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models.holding import Holding
from models.insignia import InsigniaAlumno
from models.orden import Orden, TipoOrdenEnum

# nivel: "facil" | "medio" | "dificil" | "legendario"
BADGES: dict[str, dict] = {
    # ── Fáciles ──────────────────────────────────────────────
    "primera_orden": {
        "descripcion": "Ejecutaste tu primera operación",
        "nivel": "facil",
        "icono": "🔰",
    },
    "sin_miedo_a_vender": {
        "descripcion": "Ejecutaste tu primera venta",
        "nivel": "facil",
        "icono": "📤",
    },
    "primera_ganancia": {
        "descripcion": "Tienes una posición en verde",
        "nivel": "facil",
        "icono": "📈",
    },
    "short_seller": {
        "descripcion": "Abriste tu primera posición en corto",
        "nivel": "facil",
        "icono": "🔻",
    },
    "alerta_puesta": {
        "descripcion": "Configuraste tu primera alerta de precio",
        "nivel": "facil",
        "icono": "🔔",
    },

    # ── Medios ───────────────────────────────────────────────
    "operador_activo": {
        "descripcion": "Realizaste 10 o más operaciones",
        "nivel": "medio",
        "icono": "⚡",
    },
    "portafolio_diversificado": {
        "descripcion": "Tienes 5 o más activos distintos",
        "nivel": "medio",
        "icono": "🗂️",
    },
    "explorador_mercados": {
        "descripcion": "Operaste en 3 categorías de activos distintas",
        "nivel": "medio",
        "icono": "🌐",
    },
    "cazador_de_cripto": {
        "descripcion": "Tienes Bitcoin o Ethereum en tu cartera",
        "nivel": "medio",
        "icono": "₿",
    },
    "orden_limite_ejecutada": {
        "descripcion": "Una de tus órdenes límite se ejecutó automáticamente",
        "nivel": "medio",
        "icono": "🎯",
    },

    # ── Difíciles ────────────────────────────────────────────
    "operador_veterano": {
        "descripcion": "Realizaste 50 o más operaciones",
        "nivel": "dificil",
        "icono": "🏆",
    },
    "gran_cartera": {
        "descripcion": "Tienes 10 o más activos distintos simultáneamente",
        "nivel": "dificil",
        "icono": "💼",
    },
    "rentabilidad_10": {
        "descripcion": "Lograste un rendimiento mayor al 10%",
        "nivel": "dificil",
        "icono": "🚀",
    },
    "diversificado_global": {
        "descripcion": "Operaste en 5 o más categorías de activos distintas",
        "nivel": "dificil",
        "icono": "🗺️",
    },
    "riesgo_calculado": {
        "descripcion": "Tienes posiciones largas Y cortas al mismo tiempo",
        "nivel": "dificil",
        "icono": "⚖️",
    },

    # ── Legendarios ──────────────────────────────────────────
    "centenar": {
        "descripcion": "Realizaste 100 o más operaciones",
        "nivel": "legendario",
        "icono": "💯",
    },
    "rentabilidad_50": {
        "descripcion": "Lograste un rendimiento mayor al 50% — ¡extraordinario!",
        "nivel": "legendario",
        "icono": "🌟",
    },
    "maestro_del_mercado": {
        "descripcion": "Operaste en las 6 categorías de activos disponibles",
        "nivel": "legendario",
        "icono": "👑",
    },
    "ballena": {
        "descripcion": "Tu portafolio vale más del doble del capital inicial",
        "nivel": "legendario",
        "icono": "🐋",
    },
    "sin_rendirse": {
        "descripcion": "Realizaste operaciones en 5 días distintos",
        "nivel": "legendario",
        "icono": "🔥",
    },
}

# Etiquetas de categoría por tipo de activo (para clasificar tickers)
def _categoria_ticker(ticker: str) -> str:
    t = ticker.upper()
    if t.endswith("=X"):
        return "forex"
    if t.endswith("-USD"):
        return "crypto"
    if t.endswith(".MX"):
        return "bolsa_mx"
    if t in {"SPY", "QQQ", "DIA", "IWM", "VOO", "VTI", "EFA", "EEM"}:
        return "indices"
    if t in {"GLD", "SLV", "USO", "UNG", "DBA", "DBC", "PALL", "PPLT"}:
        return "commodities"
    return "acciones"


def _otorgar(db: Session, alumno_id: uuid.UUID, grupo_id: uuid.UUID | None, codigo: str) -> bool:
    existe = db.query(InsigniaAlumno).filter(
        InsigniaAlumno.alumno_id == alumno_id,
        InsigniaAlumno.codigo == codigo,
        InsigniaAlumno.grupo_id == grupo_id,
    ).first()
    if existe:
        return False
    db.add(InsigniaAlumno(
        alumno_id=alumno_id,
        grupo_id=grupo_id,
        codigo=codigo,
        otorgada_at=datetime.now(timezone.utc),
    ))
    return True


def evaluar_y_otorgar_insignias(
    db: Session,
    alumno_id: uuid.UUID,
    grupo_id: uuid.UUID | None = None,
    capital_inicial: float | None = None,
) -> list[str]:
    nuevas: list[str] = []

    ordenes = (
        db.query(Orden)
        .filter(Orden.alumno_id == alumno_id, Orden.grupo_id == grupo_id)
        .all()
        if grupo_id else []
    )
    holdings = (
        db.query(Holding)
        .filter(Holding.alumno_id == alumno_id, Holding.grupo_id == grupo_id, Holding.cantidad > 0)
        .all()
        if grupo_id else []
    )

    # ── Fáciles ──────────────────────────────────────────────
    if ordenes:
        if _otorgar(db, alumno_id, grupo_id, "primera_orden"):
            nuevas.append("primera_orden")

    ventas = [o for o in ordenes if o.tipo == TipoOrdenEnum.venta]
    if ventas:
        if _otorgar(db, alumno_id, grupo_id, "sin_miedo_a_vender"):
            nuevas.append("sin_miedo_a_vender")

    # posición en verde
    hay_ganancia = any(
        (getattr(h, "es_corto", False) and h.precio_promedio > 0) or
        (not getattr(h, "es_corto", False) and h.cantidad > 0 and h.precio_promedio > 0)
        for h in holdings
    )
    if hay_ganancia:
        if _otorgar(db, alumno_id, grupo_id, "primera_ganancia"):
            nuevas.append("primera_ganancia")

    cortos = [h for h in holdings if getattr(h, "es_corto", False)]
    if cortos:
        if _otorgar(db, alumno_id, grupo_id, "short_seller"):
            nuevas.append("short_seller")

    # alerta_puesta se otorga externamente al crear la alerta (ver routers/ordenes_limite.py)

    # ── Medios ───────────────────────────────────────────────
    if len(ordenes) >= 10:
        if _otorgar(db, alumno_id, grupo_id, "operador_activo"):
            nuevas.append("operador_activo")

    tickers_activos = {h.ticker for h in holdings}
    if len(tickers_activos) >= 5:
        if _otorgar(db, alumno_id, grupo_id, "portafolio_diversificado"):
            nuevas.append("portafolio_diversificado")

    categorias_operadas = {_categoria_ticker(o.ticker) for o in ordenes}
    if len(categorias_operadas) >= 3:
        if _otorgar(db, alumno_id, grupo_id, "explorador_mercados"):
            nuevas.append("explorador_mercados")

    cripto_holdings = {h.ticker for h in holdings if h.ticker in ("BTC-USD", "ETH-USD")}
    if cripto_holdings:
        if _otorgar(db, alumno_id, grupo_id, "cazador_de_cripto"):
            nuevas.append("cazador_de_cripto")

    # orden_limite_ejecutada se otorga externamente en _procesar_ordenes_pendientes

    # ── Difíciles ────────────────────────────────────────────
    if len(ordenes) >= 50:
        if _otorgar(db, alumno_id, grupo_id, "operador_veterano"):
            nuevas.append("operador_veterano")

    if len(tickers_activos) >= 10:
        if _otorgar(db, alumno_id, grupo_id, "gran_cartera"):
            nuevas.append("gran_cartera")

    if capital_inicial and capital_inicial > 0:
        from models.membership import Membership
        membership = db.query(Membership).filter(
            Membership.alumno_id == alumno_id,
            Membership.grupo_id == grupo_id,
        ).first()
        if membership:
            # valor total aproximado = capital disponible + valor holdings (precio_promedio × cantidad)
            valor_holdings = sum(
                float(h.precio_promedio) * float(h.cantidad)
                for h in holdings
                if not getattr(h, "es_corto", False)
            )
            valor_total = float(membership.capital_disponible) + valor_holdings
            rendimiento_pct = (valor_total - capital_inicial) / capital_inicial * 100

            if rendimiento_pct >= 10:
                if _otorgar(db, alumno_id, grupo_id, "rentabilidad_10"):
                    nuevas.append("rentabilidad_10")

            if rendimiento_pct >= 50:
                if _otorgar(db, alumno_id, grupo_id, "rentabilidad_50"):
                    nuevas.append("rentabilidad_50")

            if valor_total >= capital_inicial * 2:
                if _otorgar(db, alumno_id, grupo_id, "ballena"):
                    nuevas.append("ballena")

    if len(categorias_operadas) >= 5:
        if _otorgar(db, alumno_id, grupo_id, "diversificado_global"):
            nuevas.append("diversificado_global")

    largos = [h for h in holdings if not getattr(h, "es_corto", False)]
    if largos and cortos:
        if _otorgar(db, alumno_id, grupo_id, "riesgo_calculado"):
            nuevas.append("riesgo_calculado")

    # ── Legendarios ──────────────────────────────────────────
    if len(ordenes) >= 100:
        if _otorgar(db, alumno_id, grupo_id, "centenar"):
            nuevas.append("centenar")

    if len(categorias_operadas) >= 6:
        if _otorgar(db, alumno_id, grupo_id, "maestro_del_mercado"):
            nuevas.append("maestro_del_mercado")

    # dias distintos con operaciones
    dias_operados = {o.timestamp.date() for o in ordenes if o.timestamp}
    if len(dias_operados) >= 5:
        if _otorgar(db, alumno_id, grupo_id, "sin_rendirse"):
            nuevas.append("sin_rendirse")

    if nuevas:
        db.commit()
    return nuevas
