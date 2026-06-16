import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import httpx
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

YF_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/"
YF_SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

TICKERS_DESTACADOS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "NFLX"]


def _to_unix_ts(d: date, end_of_day: bool = False) -> int:
    t = datetime.combine(d, datetime.min.time(), tzinfo=timezone.utc)
    if end_of_day:
        t = t.replace(hour=23, minute=59, second=59)
    return int(t.timestamp())


def _consultar_chart_rango(ticker: str, inicio: date, fin: date) -> dict:
    url = f"{YF_BASE_URL}{ticker}"
    params = {
        "period1": str(_to_unix_ts(inicio)),
        "period2": str(_to_unix_ts(fin, end_of_day=True)),
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


def _consultar_chart(ticker: str, dias: int) -> dict:
    hoy = datetime.now(timezone.utc).date()
    inicio = hoy - timedelta(days=dias)
    return _consultar_chart_rango(ticker, inicio, hoy)


def obtener_precio_actual(ticker: str) -> Decimal:
    return _obtener_precio_y_cambio(ticker)[0]


def _obtener_precio_y_cambio(ticker: str) -> tuple[Decimal, float]:
    ticker = ticker.upper().strip()
    resultado = _consultar_chart(ticker, dias=7)

    cierres = ((resultado.get("indicators") or {}).get("quote") or [{}])[0].get("close") or []
    meta = resultado.get("meta") or {}
    precio_meta = meta.get("regularMarketPrice")
    precio_previo = meta.get("chartPreviousClose") or meta.get("previousClose")

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

    cambio_porcentaje = 0.0
    if precio_previo:
        cambio_porcentaje = (float(precio) - float(precio_previo)) / float(precio_previo) * 100

    return Decimal(str(precio)), cambio_porcentaje


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


def obtener_historial_precios_rango(ticker: str, fecha_inicio: date, fecha_fin: date) -> list[dict]:
    ticker = ticker.upper().strip()
    resultado = _consultar_chart_rango(ticker, fecha_inicio, fecha_fin)

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
            detail=f"No se encontro historial de precios para el ticker {ticker} en ese periodo",
        )
    return historial


def obtener_noticias(ticker: str, cantidad: int = 6) -> list[dict]:
    ticker = ticker.upper().strip()
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    params = {"q": ticker, "newsCount": str(cantidad), "quotesCount": "0"}

    try:
        resp = httpx.get(YF_SEARCH_URL, params=params, headers=headers, timeout=15.0)
    except httpx.HTTPError:
        logger.exception("Error de red consultando noticias para %s", ticker)
        return []

    if resp.status_code != 200:
        logger.error("yahoo search status %s para %s", resp.status_code, ticker)
        return []

    noticias = (resp.json() or {}).get("news") or []
    resultado = []
    for n in noticias[:cantidad]:
        publicado = n.get("providerPublishTime")
        resultado.append(
            {
                "titulo": n.get("title"),
                "fuente": n.get("publisher"),
                "link": n.get("link"),
                "fecha": (
                    datetime.fromtimestamp(int(publicado), tz=timezone.utc).isoformat()
                    if publicado
                    else None
                ),
            }
        )
    return resultado


def obtener_precios_destacados() -> list[dict]:
    destacados = []
    for ticker in TICKERS_DESTACADOS:
        try:
            precio, cambio_porcentaje = _obtener_precio_y_cambio(ticker)
        except HTTPException:
            continue
        destacados.append({"ticker": ticker, "precio": precio, "cambio_porcentaje": cambio_porcentaje})
    return destacados
