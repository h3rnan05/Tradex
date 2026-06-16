import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import httpx
from fastapi import HTTPException, status

from config import settings

logger = logging.getLogger(__name__)

YF_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/"
YF_SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search"
YF_SUMMARY_URL = "https://query1.finance.yahoo.com/v10/finance/quoteSummary/"
EODHD_EOD_URL = "https://eodhd.com/api/eod/"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

TICKERS_DESTACADOS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "NFLX"]

INDICES_MERCADO = [
    {"ticker": "^GSPC", "nombre": "S&P 500"},
    {"ticker": "^DJI", "nombre": "Dow Jones"},
    {"ticker": "^IXIC", "nombre": "Nasdaq"},
    {"ticker": "^RUT", "nombre": "Russell 2000"},
    {"ticker": "^VIX", "nombre": "Volatilidad"},
    {"ticker": "GC=F", "nombre": "Oro"},
]


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


def _consultar_volumenes_eodhd(ticker: str, inicio: date, fin: date) -> dict[str, int]:
    if not settings.eodhd_api_key:
        return {}
    simbolo = ticker if "." in ticker else f"{ticker}.US"
    params = {
        "api_token": settings.eodhd_api_key,
        "fmt": "json",
        "period": "d",
        "from": inicio.isoformat(),
        "to": fin.isoformat(),
    }
    try:
        resp = httpx.get(f"{EODHD_EOD_URL}{simbolo}", params=params, timeout=15.0)
    except httpx.HTTPError:
        logger.exception("Error de red consultando volumen EODHD para %s", ticker)
        return {}

    if resp.status_code != 200:
        logger.warning("EODHD status %s para %s", resp.status_code, ticker)
        return {}

    datos = resp.json()
    if not isinstance(datos, list):
        return {}
    return {d["date"]: d.get("volume") for d in datos if d.get("date") and d.get("volume") is not None}


def obtener_historial_precios(ticker: str, dias: int = 30) -> list[dict]:
    ticker = ticker.upper().strip()
    resultado = _consultar_chart(ticker, dias=dias)

    timestamps = resultado.get("timestamp") or []
    cotizacion = ((resultado.get("indicators") or {}).get("quote") or [{}])[0]
    cierres = cotizacion.get("close") or []
    aperturas = cotizacion.get("open") or []
    maximos = cotizacion.get("high") or []
    minimos = cotizacion.get("low") or []

    historial = []
    for i, (ts, cierre) in enumerate(zip(timestamps, cierres)):
        if cierre is None:
            continue
        fecha = datetime.fromtimestamp(int(ts), tz=timezone.utc).date()
        apertura = aperturas[i] if i < len(aperturas) else None
        maximo = maximos[i] if i < len(maximos) else None
        minimo = minimos[i] if i < len(minimos) else None
        historial.append({
            "fecha": fecha.isoformat(),
            "precio": Decimal(str(cierre)),
            "apertura": Decimal(str(apertura)) if apertura is not None else None,
            "maximo": Decimal(str(maximo)) if maximo is not None else None,
            "minimo": Decimal(str(minimo)) if minimo is not None else None,
        })

    if not historial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontro historial de precios para el ticker {ticker}",
        )

    volumenes = _consultar_volumenes_eodhd(
        ticker, date.fromisoformat(historial[0]["fecha"]), date.fromisoformat(historial[-1]["fecha"])
    )
    for item in historial:
        item["volumen"] = volumenes.get(item["fecha"])

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


def _buscar_noticias_yahoo(query: str, cantidad: int) -> list[dict]:
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    params = {"q": query, "newsCount": str(cantidad), "quotesCount": "0"}

    try:
        resp = httpx.get(YF_SEARCH_URL, params=params, headers=headers, timeout=15.0)
    except httpx.HTTPError:
        logger.exception("Error de red consultando noticias para %s", query)
        return []

    if resp.status_code != 200:
        logger.error("yahoo search status %s para %s", resp.status_code, query)
        return []

    noticias = (resp.json() or {}).get("news") or []
    resultado = []
    for n in noticias[:cantidad]:
        publicado = n.get("providerPublishTime")
        miniatura = (n.get("thumbnail") or {}).get("resolutions") or []
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
                "imagen": miniatura[0].get("url") if miniatura else None,
            }
        )
    return resultado


def obtener_noticias(ticker: str, cantidad: int = 6) -> list[dict]:
    return _buscar_noticias_yahoo(ticker.upper().strip(), cantidad)


def obtener_noticias_generales(cantidad: int = 8) -> list[dict]:
    return _buscar_noticias_yahoo("stock market", cantidad)


def obtener_precios_destacados() -> list[dict]:
    destacados = []
    for ticker in TICKERS_DESTACADOS:
        try:
            precio, cambio_porcentaje = _obtener_precio_y_cambio(ticker)
        except HTTPException:
            continue
        sparkline = []
        try:
            historial = obtener_historial_precios(ticker, dias=30)
            sparkline = [item["precio"] for item in historial]
        except HTTPException:
            pass
        destacados.append({
            "ticker": ticker,
            "precio": precio,
            "cambio_porcentaje": cambio_porcentaje,
            "sparkline": sparkline,
        })
    return destacados


def obtener_precios_indices() -> list[dict]:
    resultado = []
    for indice in INDICES_MERCADO:
        ticker = indice["ticker"]
        try:
            precio, cambio_porcentaje = _obtener_precio_y_cambio(ticker)
        except HTTPException:
            continue
        sparkline = []
        try:
            historial = obtener_historial_precios(ticker, dias=30)
            sparkline = [item["precio"] for item in historial]
        except HTTPException:
            pass
        resultado.append({
            "ticker": ticker,
            "nombre": indice["nombre"],
            "precio": precio,
            "cambio_porcentaje": cambio_porcentaje,
            "sparkline": sparkline,
        })
    return resultado


_EARNINGS_WATCHLIST = [
    # Mega-cap tech
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA",
    # Semiconductors
    "AMD", "INTC", "QCOM", "TXN", "AMAT", "MU", "LRCX", "KLAC", "MRVL", "AVGO",
    # Software / Cloud
    "ADBE", "CRM", "ORCL", "IBM", "NOW", "WDAY", "SNOW", "PANW", "CRWD", "ZS",
    # Financials
    "JPM", "BAC", "GS", "MS", "C", "WFC", "V", "MA", "AXP", "BLK",
    # Consumer / Retail
    "WMT", "COST", "HD", "TGT", "NKE", "SBUX", "MCD", "YUM", "DG", "DLTR",
    # Health
    "JNJ", "UNH", "PFE", "ABBV", "MRK", "LLY", "CVS", "BMY", "AMGN", "GILD",
    # Industrial / Energy
    "BA", "CAT", "HON", "GE", "MMM", "XOM", "CVX", "COP", "SLB", "HAL",
    # Telecom / Media
    "NFLX", "DIS", "CMCSA", "T", "VZ", "CHTR", "PARA", "WBD",
    # Consumer staples
    "KO", "PEP", "PG", "CL", "KHC", "GIS", "CPB", "K",
    # Others
    "PYPL", "SQ", "UBER", "LYFT", "AIRB", "ABNB", "BKNG", "EXPE",
    "FDX", "UPS", "DAL", "AAL", "UAL", "LUV",
    "SNAP", "PINS", "TWTR", "RBLX", "U", "MTCH",
    "F", "GM", "RIVN", "LCID",
]


def _fetch_earnings_ticker(ticker: str, crumb: str, cookies: dict, hoy, fin) -> dict | None:
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    params = {"modules": "calendarEvents,price", "crumb": crumb}
    try:
        resp = httpx.get(
            f"{YF_SUMMARY_URL}{ticker}",
            params=params, headers=headers, cookies=cookies, timeout=10.0,
        )
        if resp.status_code != 200:
            return None
        result = ((resp.json() or {}).get("quoteSummary") or {}).get("result") or []
        if not result:
            return None
        data = result[0]
        cal = (data.get("calendarEvents") or {}).get("earnings") or {}
        dates = cal.get("earningsDate") or []
        if not dates:
            return None
        ts = dates[0].get("raw") if isinstance(dates[0], dict) else dates[0]
        fecha = datetime.fromtimestamp(ts, tz=timezone.utc).date()
        if not (hoy <= fecha <= fin):
            return None
        price_info = data.get("price") or {}
        nombre = price_info.get("longName") or price_info.get("shortName") or ticker
        eps_est_raw = cal.get("epsEstimate") or {}
        eps_est = eps_est_raw.get("raw") if isinstance(eps_est_raw, dict) else eps_est_raw
        return {
            "fecha": fecha.isoformat(),
            "ticker": ticker,
            "empresa": nombre,
            "eps_estimado": eps_est,
        }
    except Exception:
        return None


def obtener_earnings_calendar() -> list[dict]:
    hoy = datetime.now(timezone.utc).date()
    fin = hoy + timedelta(days=45)
    crumb, cookies = _obtener_crumb_yf()
    resultados = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {
            executor.submit(_fetch_earnings_ticker, ticker, crumb, cookies, hoy, fin): ticker
            for ticker in _EARNINGS_WATCHLIST
        }
        for future in as_completed(futures):
            r = future.result()
            if r:
                resultados.append(r)
    return sorted(resultados, key=lambda x: x["fecha"])


_SECTORES = [
    {"nombre": "Tecnología", "ticker": "XLK"},
    {"nombre": "Salud", "ticker": "XLV"},
    {"nombre": "Financiero", "ticker": "XLF"},
    {"nombre": "Consumo Discrecional", "ticker": "XLY"},
    {"nombre": "Consumo Básico", "ticker": "XLP"},
    {"nombre": "Energía", "ticker": "XLE"},
    {"nombre": "Industrial", "ticker": "XLI"},
    {"nombre": "Materiales", "ticker": "XLB"},
    {"nombre": "Servicios Públicos", "ticker": "XLU"},
    {"nombre": "Inmobiliario", "ticker": "XLRE"},
    {"nombre": "Comunicaciones", "ticker": "XLC"},
]


def obtener_sectores() -> list[dict]:
    resultado = []
    for s in _SECTORES:
        try:
            _, cambio = _obtener_precio_y_cambio(s["ticker"])
            resultado.append({"sector": s["nombre"], "cambio_porcentaje": round(cambio, 2)})
        except HTTPException:
            resultado.append({"sector": s["nombre"], "cambio_porcentaje": None})
    return resultado


def obtener_screener(tipo: str) -> list[dict]:
    tipos_validos = {"most_actives", "day_gainers", "day_losers"}
    if tipo not in tipos_validos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de screener inválido. Opciones: {', '.join(tipos_validos)}",
        )
    count = 20 if tipo == "most_actives" else 10
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    params = {"formatted": "true", "scrIds": tipo, "count": str(count)}
    url = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved"
    try:
        resp = httpx.get(url, params=params, headers=headers, timeout=15.0)
    except httpx.HTTPError:
        logger.exception("Error de red consultando screener %s", tipo)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo consultar el screener",
        )
    if resp.status_code != 200:
        logger.warning("screener status %s para %s", resp.status_code, tipo)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Yahoo Finance devolvió un error al consultar el screener",
        )
    quotes = (((resp.json() or {}).get("finance") or {}).get("result") or [{}])[0].get("quotes") or []

    def raw(obj, key):
        v = obj.get(key)
        if isinstance(v, dict):
            return v.get("raw")
        return v

    return [
        {
            "symbol": q.get("symbol"),
            "shortName": q.get("shortName"),
            "precio": raw(q, "regularMarketPrice"),
            "cambio_porcentaje": raw(q, "regularMarketChangePercent"),
            "volumen": raw(q, "regularMarketVolume"),
            "market_cap": raw(q, "marketCap"),
        }
        for q in quotes
    ]


_yf_crumb: str | None = None
_yf_cookies: dict = {}


def _obtener_crumb_yf() -> tuple[str, dict]:
    """Fetch a valid Yahoo Finance crumb + cookies (cached in module-level vars)."""
    global _yf_crumb, _yf_cookies
    if _yf_crumb:
        return _yf_crumb, _yf_cookies

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }
    try:
        # Step 1: visit Yahoo Finance to get cookies (incl. A3 consent cookie)
        r = httpx.get(
            "https://finance.yahoo.com",
            headers=headers,
            timeout=15.0,
            follow_redirects=True,
        )
        cookies = dict(r.cookies)
        # Step 2: get crumb using those cookies
        for host in ("query1", "query2"):
            r2 = httpx.get(
                f"https://{host}.finance.yahoo.com/v1/test/getcrumb",
                headers={**headers, "Accept": "*/*"},
                cookies=cookies,
                timeout=10.0,
            )
            if r2.status_code == 200 and r2.text and r2.text not in ("", "null"):
                _yf_crumb = r2.text.strip()
                _yf_cookies = cookies
                logger.info("Yahoo Finance crumb obtenido via %s", host)
                return _yf_crumb, _yf_cookies
    except Exception:
        logger.warning("No se pudo obtener crumb de Yahoo Finance")
    return "", {}


def obtener_ficha_empresa(ticker: str) -> dict:
    ticker = ticker.upper().strip()
    crumb, cookies = _obtener_crumb_yf()
    params = {
        "modules": "summaryDetail,financialData,defaultKeyStatistics,recommendationTrend",
        "crumb": crumb,
    }
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    try:
        resp = httpx.get(
            f"{YF_SUMMARY_URL}{ticker}", params=params, headers=headers,
            cookies=cookies, timeout=15.0,
        )
    except httpx.HTTPError:
        logger.exception("Error de red consultando ficha empresa %s", ticker)
        return {}

    if resp.status_code == 401:
        # Crumb expired — reset and retry once
        global _yf_crumb, _yf_cookies
        _yf_crumb = None
        _yf_cookies = {}
        crumb, cookies = _obtener_crumb_yf()
        try:
            resp = httpx.get(
                f"{YF_SUMMARY_URL}{ticker}",
                params={**params, "crumb": crumb},
                headers=headers, cookies=cookies, timeout=15.0,
            )
        except httpx.HTTPError:
            return {}

    if resp.status_code != 200:
        logger.warning("quoteSummary status %s para %s", resp.status_code, ticker)
        return {}

    data = (resp.json() or {}).get("quoteSummary") or {}
    if data.get("error") or not data.get("result"):
        return {}

    result = data["result"][0]
    sd = result.get("summaryDetail") or {}
    fd = result.get("financialData") or {}
    ks = result.get("defaultKeyStatistics") or {}
    rt = result.get("recommendationTrend") or {}

    def raw(obj, key):
        v = obj.get(key)
        if isinstance(v, dict):
            return v.get("raw")
        return v

    tendencia = (rt.get("trend") or [{}])[0]

    return {
        "pe_ratio": raw(sd, "trailingPE"),
        "forward_pe": raw(sd, "forwardPE"),
        "eps": raw(ks, "trailingEps"),
        "market_cap": raw(sd, "marketCap"),
        "beta": raw(sd, "beta"),
        "max_52s": raw(sd, "fiftyTwoWeekHigh"),
        "min_52s": raw(sd, "fiftyTwoWeekLow"),
        "precio_objetivo": raw(fd, "targetMeanPrice"),
        "recomendacion": fd.get("recommendationKey"),
        "analistas": {
            "strong_buy": tendencia.get("strongBuy", 0),
            "buy": tendencia.get("buy", 0),
            "hold": tendencia.get("hold", 0),
            "sell": tendencia.get("sell", 0),
            "strong_sell": tendencia.get("strongSell", 0),
        },
    }
