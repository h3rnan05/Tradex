import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import httpx
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

YF_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def _to_unix_ts(d: date, end_of_day: bool = False) -> int:
    t = datetime.combine(d, datetime.min.time(), tzinfo=timezone.utc)
    if end_of_day:
        t = t.replace(hour=23, minute=59, second=59)
    return int(t.timestamp())


def _consultar_chart(ticker: str, dias: int) -> dict:
    hoy = datetime.now(timezone.utc).date()
    inicio = hoy - timedelta(days=dias)

    url = f"{YF_BASE_URL}{ticker}"
    params = {
        "period1": str(_to_unix_ts(inicio)),
        "period2": str(_to_unix_ts(hoy, end_of_day=True)),
        "interval": "1d",
        "events": "history",
        "includeAdjustedClose": "true",
    }
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}

    try:
        resp = httpx.get(url, params=params, headers=headers, timeout=15.0)
    except httpx.HTTPError as e:
        logger.exception("Error de red consultando yfinance para %s", ticker)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No se pudo consultar el precio de {ticker}: {e}",
        ) from e

    if resp.status_code in (429, 999):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Yahoo Finance esta limitando las solicitudes, intenta de nuevo en unos segundos",
        )
    if resp.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontro el ticker {ticker}",
        )
    if resp.status_code != 200:
        logger.error("yfinance status %s para %s: %s", resp.status_code, ticker, resp.text[:200])
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Yahoo Finance devolvio un error inesperado para {ticker}",
        )

    payload = resp.json()
    chart = (payload or {}).get("chart") or {}
    if chart.get("error"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontro el precio para el ticker {ticker}",
        )

    resultados = chart.get("result") or []
    if not resultados:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontro el precio para el ticker {ticker}",
        )
    return resultados[0]


def obtener_precio_actual(ticker: str) -> Decimal:
    ticker = ticker.upper().strip()
    resultado = _consultar_chart(ticker, dias=7)

    cierres = ((resultado.get("indicators") or {}).get("quote") or [{}])[0].get("close") or []
    precio_meta = (resultado.get("meta") or {}).get("regularMarketPrice")

    precio = None
    for cierre in reversed(cierres):
        if cierre is not None:
            precio = cierre
            break
    if precio is None:
        precio = precio_meta

    if precio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontro el precio para el ticker {ticker}",
        )
    return Decimal(str(precio))


def obtener_historial_precios(ticker: str, dias: int = 30) -> list[dict]:
    ticker = ticker.upper().strip()
    resultado = _consultar_chart(ticker, dias=dias)

    timestamps = resultado.get("timestamp") or []
    cierres = ((resultado.get("indicators") or {}).get("quote") or [{}])[0].get("close") or []

    historial = []
    for ts, cierre in zip(timestamps, cierres):
        if cierre is None:
            continue
        fecha = datetime.fromtimestamp(int(ts), tz=timezone.utc).date()
        historial.append({"fecha": fecha.isoformat(), "precio": Decimal(str(cierre))})

    if not historial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontro historial de precios para el ticker {ticker}",
        )
    return historial
