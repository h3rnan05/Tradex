"""Shared utilities for portfolio valuation and rendimiento computation.

These helpers eliminate duplicated holdings-value calculations that previously
appeared across multiple routers (grupos, admin, sponsor, alumnos).
"""

from decimal import Decimal
from typing import Sequence

from models.holding import Holding
from precios_utils import obtener_precio_actual


def calcular_valor_holdings(
    holdings: Sequence[Holding],
    precios_cache: dict[str, Decimal] | None = None,
) -> Decimal:
    """Sum the market value of a list of holdings using current prices.

    *precios_cache* is a mutable dict used to avoid repeated price lookups
    for the same ticker across multiple calls.  If ``None``, a local cache is
    created (not shared across calls).
    """
    if precios_cache is None:
        precios_cache = {}

    valor = Decimal("0")
    for h in holdings:
        if h.cantidad <= 0:
            continue
        if h.ticker not in precios_cache:
            try:
                precios_cache[h.ticker] = obtener_precio_actual(h.ticker)
            except Exception:
                precios_cache[h.ticker] = h.precio_promedio
        valor += precios_cache[h.ticker] * h.cantidad
    return valor


def calcular_rendimiento(
    valor_total: Decimal, capital_inicial: Decimal
) -> tuple[Decimal, Decimal]:
    """Return (rendimiento, rendimiento_porcentaje) given total value and initial capital."""
    rendimiento = valor_total - capital_inicial
    rendimiento_porcentaje = (
        (rendimiento / capital_inicial * 100) if capital_inicial else Decimal("0")
    )
    return rendimiento, rendimiento_porcentaje


def calcular_valor_portafolio(
    capital_disponible: Decimal,
    holdings: Sequence[Holding],
    precios_cache: dict[str, Decimal] | None = None,
    capital_inicial: Decimal = Decimal("0"),
) -> tuple[Decimal, Decimal, Decimal]:
    """Compute portfolio total value and performance in one call.

    Returns (valor_total, rendimiento, rendimiento_porcentaje).
    """
    valor_holdings = calcular_valor_holdings(holdings, precios_cache)
    valor_total = capital_disponible + valor_holdings
    rendimiento, rendimiento_porcentaje = calcular_rendimiento(valor_total, capital_inicial)
    return valor_total, rendimiento, rendimiento_porcentaje
