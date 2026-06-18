import logging
import re
import threading
import time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from email.utils import parsedate_to_datetime
from functools import wraps

import httpx
from fastapi import HTTPException, status

from config import settings

_TICKER_RE = re.compile(r'^[A-Z0-9\.\^\=\-\+]{1,15}$')

# Símbolos de criptomonedas conocidas. En Yahoo Finance la cripto se cotiza con
# el sufijo -USD (BTC-USD). Si el usuario escribe el símbolo "pelado" (BTC),
# resolvería a OTRO instrumento (un fondo distinto), así que lo normalizamos a
# su par -USD para que "BTC" signifique Bitcoin de verdad.
_CRYPTO_SYMBOLS = {
    "BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "MATIC", "SHIB",
    "LTC", "BCH", "DOT", "LINK", "UNI", "ATOM", "XLM", "ETC", "FIL",
    "ICP", "NEAR", "APT", "ARB", "OP", "INJ", "TRX", "BNB", "ALGO", "XMR",
}


def normalizar_ticker(ticker: str) -> str:
    """Convierte símbolos de cripto pelados (BTC) a su par -USD (BTC-USD)."""
    t = ticker.upper().strip()
    if t in _CRYPTO_SYMBOLS:
        return f"{t}-USD"
    return t

# ── Simple in-memory TTL cache ────────────────────────────────────────────
# Market data changes slowly relative to how often the UI requests it. Caching
# responses for a few seconds/minutes turns repeated page loads from dozens of
# slow external API calls into instant memory hits. Thread-safe so it works with
# uvicorn's threadpool. Only successful results are cached (errors are not).
_cache_lock = threading.Lock()
_cache_store: dict = {}


def ttl_cache(seconds: int):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            key = (func.__name__, args, tuple(sorted(kwargs.items())))
            now = time.monotonic()
            with _cache_lock:
                hit = _cache_store.get(key)
                if hit is not None and hit[0] > now:
                    return hit[1]
            result = func(*args, **kwargs)
            with _cache_lock:
                _cache_store[key] = (now + seconds, result)
            return result
        return wrapper
    return decorator


def validar_ticker(ticker: str) -> str:
    t = normalizar_ticker(ticker)
    if not _TICKER_RE.match(t):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Ticker inválido: '{ticker}'")
    return t

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


@ttl_cache(seconds=60)
def _obtener_precio_y_cambio(ticker: str) -> tuple[Decimal, float]:
    ticker = normalizar_ticker(ticker)
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


@ttl_cache(seconds=300)
def obtener_historial_precios(ticker: str, dias: int = 30) -> list[dict]:
    ticker = normalizar_ticker(ticker)
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
    ticker = normalizar_ticker(ticker)
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
    # Yahoo no garantiza orden: ordenar por fecha de publicación (recientes primero)
    noticias.sort(key=lambda n: n.get("providerPublishTime") or 0, reverse=True)
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


YF_RSS_URL = "https://feeds.finance.yahoo.com/rss/2.0/headline"

# Cesta de tickers grandes para alimentar las noticias generales de mercado.
_NOTICIAS_GENERALES_TICKERS = "AAPL,MSFT,GOOGL,AMZN,NVDA,TSLA,SPY"

_IMG_RE = re.compile(r'<img[^>]+src="([^"]+)"', re.IGNORECASE)


def _buscar_noticias_rss(symbols: str, cantidad: int) -> list[dict]:
    """Lee el feed RSS de titulares de Yahoo Finance (recientes y ordenados por fecha)."""
    headers = {"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/xml"}
    params = {"s": symbols, "region": "US", "lang": "en-US"}
    try:
        resp = httpx.get(YF_RSS_URL, params=params, headers=headers, timeout=15.0)
    except httpx.HTTPError:
        logger.exception("Error de red consultando RSS de noticias para %s", symbols)
        return []
    if resp.status_code != 200:
        logger.warning("yahoo rss status %s para %s", resp.status_code, symbols)
        return []

    try:
        root = ET.fromstring(resp.content)
    except ET.ParseError:
        logger.warning("RSS de noticias mal formado para %s", symbols)
        return []

    resultado = []
    for item in root.iterfind(".//item"):
        titulo = item.findtext("title")
        link = item.findtext("link")
        fuente = item.findtext("source") or "Yahoo Finance"
        pub = item.findtext("pubDate")
        descripcion = item.findtext("description") or ""
        fecha_iso = None
        fecha_dt = None
        if pub:
            try:
                fecha_dt = parsedate_to_datetime(pub)
                fecha_iso = fecha_dt.astimezone(timezone.utc).isoformat()
            except (TypeError, ValueError):
                pass
        img_match = _IMG_RE.search(descripcion)
        resultado.append({
            "titulo": titulo,
            "fuente": fuente,
            "link": link,
            "fecha": fecha_iso,
            "_orden": fecha_dt.timestamp() if fecha_dt else 0,
            "imagen": img_match.group(1) if img_match else None,
        })

    # Más recientes primero
    resultado.sort(key=lambda n: n["_orden"], reverse=True)
    for n in resultado:
        n.pop("_orden", None)
    return resultado[:cantidad]


@ttl_cache(seconds=180)
def obtener_noticias(ticker: str, cantidad: int = 6) -> list[dict]:
    ticker = normalizar_ticker(ticker)
    noticias = _buscar_noticias_rss(ticker, cantidad)
    if not noticias:
        # Respaldo: endpoint de búsqueda
        noticias = _buscar_noticias_yahoo(ticker, cantidad)
    return noticias


@ttl_cache(seconds=180)
def obtener_noticias_generales(cantidad: int = 8) -> list[dict]:
    noticias = _buscar_noticias_rss(_NOTICIAS_GENERALES_TICKERS, cantidad)
    if not noticias:
        noticias = _buscar_noticias_yahoo("stock market", cantidad)
    return noticias


def _destacado_de_ticker(ticker: str, nombre: str | None = None) -> dict | None:
    try:
        precio, cambio_porcentaje = _obtener_precio_y_cambio(ticker)
    except HTTPException:
        return None
    sparkline = []
    try:
        historial = obtener_historial_precios(ticker, dias=30)
        sparkline = [item["precio"] for item in historial]
    except HTTPException:
        pass
    item = {
        "ticker": ticker,
        "precio": precio,
        "cambio_porcentaje": cambio_porcentaje,
        "sparkline": sparkline,
    }
    if nombre is not None:
        item["nombre"] = nombre
    return item


@ttl_cache(seconds=120)
def obtener_trending() -> list[dict]:
    """Return up to 16 real-time trending tickers (most active + top gainers/losers)."""
    import httpx as _httpx
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}

    def _fetch_screener(tipo: str, count: int) -> list[str]:
        try:
            resp = _httpx.get(
                "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved",
                params={"formatted": "true", "scrIds": tipo, "count": str(count)},
                headers=headers,
                timeout=10.0,
            )
            if resp.status_code != 200:
                return []
            quotes = (((resp.json() or {}).get("finance") or {}).get("result") or [{}])[0].get("quotes") or []
            return [q["symbol"] for q in quotes if q.get("symbol")]
        except Exception:
            return []

    # Parallel fetch of three screeners
    with ThreadPoolExecutor(max_workers=3) as ex:
        f_active = ex.submit(_fetch_screener, "most_actives", 8)
        f_gainers = ex.submit(_fetch_screener, "day_gainers", 5)
        f_losers = ex.submit(_fetch_screener, "day_losers", 5)
        actives = f_active.result()
        gainers = f_gainers.result()
        losers = f_losers.result()

    # Deduplicate while preserving order: actives first, then gainers, then losers
    seen: set[str] = set()
    tickers: list[str] = []
    for t in actives + gainers + losers:
        if t not in seen:
            seen.add(t)
            tickers.append(t)
        if len(tickers) >= 16:
            break

    # Fall back to curated list if screener failed
    if not tickers:
        tickers = TICKERS_DESTACADOS

    with ThreadPoolExecutor(max_workers=8) as ex:
        futuros = {ex.submit(_destacado_de_ticker, t): t for t in tickers}
        resultados = {futuros[f]: f.result() for f in as_completed(futuros)}

    return [resultados[t] for t in tickers if resultados.get(t)]


@ttl_cache(seconds=60)
def obtener_precios_destacados() -> list[dict]:
    # Fetch all tickers in parallel instead of one-by-one — this turns ~16
    # sequential external calls into a handful of concurrent ones.
    with ThreadPoolExecutor(max_workers=8) as executor:
        futuros = {executor.submit(_destacado_de_ticker, t): t for t in TICKERS_DESTACADOS}
        resultados = {futuros[f]: f.result() for f in as_completed(futuros)}
    # Preserve the original ticker order
    return [resultados[t] for t in TICKERS_DESTACADOS if resultados.get(t)]


@ttl_cache(seconds=60)
def obtener_precios_indices() -> list[dict]:
    with ThreadPoolExecutor(max_workers=6) as executor:
        futuros = {
            executor.submit(_destacado_de_ticker, ind["ticker"], ind["nombre"]): ind["ticker"]
            for ind in INDICES_MERCADO
        }
        resultados = {futuros[f]: f.result() for f in as_completed(futuros)}
    return [resultados[ind["ticker"]] for ind in INDICES_MERCADO if resultados.get(ind["ticker"])]


# Listas curadas para el explorador de mercados en la pestaña Operar.
# Cada categoría coincide con los tipos de activo que el maestro puede habilitar
# (acciones, indices, commodities, crypto).
EXPLORADOR_CATEGORIAS: dict[str, list[dict]] = {
    "acciones": [
        {"ticker": "AAPL", "nombre": "Apple"},
        {"ticker": "MSFT", "nombre": "Microsoft"},
        {"ticker": "GOOGL", "nombre": "Alphabet"},
        {"ticker": "AMZN", "nombre": "Amazon"},
        {"ticker": "NVDA", "nombre": "NVIDIA"},
        {"ticker": "TSLA", "nombre": "Tesla"},
        {"ticker": "META", "nombre": "Meta"},
        {"ticker": "NFLX", "nombre": "Netflix"},
        {"ticker": "JPM", "nombre": "JPMorgan"},
        {"ticker": "DIS", "nombre": "Disney"},
        {"ticker": "KO", "nombre": "Coca-Cola"},
        {"ticker": "NKE", "nombre": "Nike"},
    ],
    "indices": [
        {"ticker": "SPY", "nombre": "S&P 500 ETF"},
        {"ticker": "QQQ", "nombre": "Nasdaq 100 ETF"},
        {"ticker": "DIA", "nombre": "Dow Jones ETF"},
        {"ticker": "IWM", "nombre": "Russell 2000 ETF"},
        {"ticker": "VOO", "nombre": "Vanguard S&P 500"},
        {"ticker": "VTI", "nombre": "Vanguard Total Market"},
        {"ticker": "EFA", "nombre": "Mercados Desarrollados"},
        {"ticker": "EEM", "nombre": "Mercados Emergentes"},
    ],
    "commodities": [
        {"ticker": "GLD", "nombre": "Oro"},
        {"ticker": "SLV", "nombre": "Plata"},
        {"ticker": "USO", "nombre": "Petróleo"},
        {"ticker": "UNG", "nombre": "Gas Natural"},
        {"ticker": "DBA", "nombre": "Agricultura"},
        {"ticker": "DBC", "nombre": "Commodities Mix"},
        {"ticker": "PPLT", "nombre": "Platino"},
        {"ticker": "PALL", "nombre": "Paladio"},
    ],
    "crypto": [
        {"ticker": "BTC-USD", "nombre": "Bitcoin"},
        {"ticker": "ETH-USD", "nombre": "Ethereum"},
        {"ticker": "SOL-USD", "nombre": "Solana"},
        {"ticker": "XRP-USD", "nombre": "XRP"},
        {"ticker": "DOGE-USD", "nombre": "Dogecoin"},
        {"ticker": "ADA-USD", "nombre": "Cardano"},
        {"ticker": "AVAX-USD", "nombre": "Avalanche"},
        {"ticker": "LINK-USD", "nombre": "Chainlink"},
    ],
    "forex": [
        {"ticker": "EURUSD=X", "nombre": "Euro / Dólar"},
        {"ticker": "GBPUSD=X", "nombre": "Libra / Dólar"},
        {"ticker": "USDJPY=X", "nombre": "Dólar / Yen"},
        {"ticker": "USDMXN=X", "nombre": "Dólar / Peso MX"},
        {"ticker": "USDCAD=X", "nombre": "Dólar / Dólar CA"},
        {"ticker": "AUDUSD=X", "nombre": "Dólar AU / Dólar"},
        {"ticker": "USDCHF=X", "nombre": "Dólar / Franco CH"},
        {"ticker": "NZDUSD=X", "nombre": "Dólar NZ / Dólar"},
    ],
    "bolsa_mx": [
        {"ticker": "AMXL.MX", "nombre": "América Móvil"},
        {"ticker": "FEMSAUBD.MX", "nombre": "FEMSA"},
        {"ticker": "WALMEX.MX", "nombre": "Walmart México"},
        {"ticker": "GMEXICOB.MX", "nombre": "Grupo México"},
        {"ticker": "GFNORTEO.MX", "nombre": "Banorte"},
        {"ticker": "BIMBOA.MX", "nombre": "Bimbo"},
        {"ticker": "CEMEXCPO.MX", "nombre": "CEMEX"},
        {"ticker": "ALSEA.MX", "nombre": "Alsea"},
        {"ticker": "GRUMAB.MX", "nombre": "Gruma"},
        {"ticker": "LABB.MX", "nombre": "Genomma Lab"},
    ],
}


@ttl_cache(seconds=60)
def obtener_explorador_categoria(categoria: str) -> list[dict]:
    tickers = EXPLORADOR_CATEGORIAS.get(categoria)
    if not tickers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Categoría inválida: '{categoria}'",
        )
    with ThreadPoolExecutor(max_workers=8) as executor:
        futuros = {
            executor.submit(_destacado_de_ticker, t["ticker"], t["nombre"]): t["ticker"]
            for t in tickers
        }
        resultados = {futuros[f]: f.result() for f in as_completed(futuros)}
    return [resultados[t["ticker"]] for t in tickers if resultados.get(t["ticker"])]


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
    # Others (TWTR→eliminado, AIRB→typo era ABNB, SQ→XYZ renombrado)
    "PYPL", "XYZ", "UBER", "LYFT", "ABNB", "BKNG", "EXPE",
    "FDX", "UPS", "DAL", "AAL", "UAL", "LUV",
    "SNAP", "PINS", "RBLX", "MTCH",
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
        eps_est_raw = cal.get("earningsAverage") or {}
        eps_est = eps_est_raw.get("raw") if isinstance(eps_est_raw, dict) else eps_est_raw
        momento_raw = cal.get("earningsCallTime") or ""
        if momento_raw == "BMO":
            momento = "Antes apertura"
        elif momento_raw == "AMC":
            momento = "Después cierre"
        else:
            momento = None
        return {
            "fecha": fecha.isoformat(),
            "ticker": ticker,
            "empresa": nombre,
            "momento": momento,
            "eps_estimado": eps_est,
        }
    except Exception:
        return None


@ttl_cache(seconds=900)
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


@ttl_cache(seconds=300)
def obtener_sectores() -> list[dict]:
    resultado = []
    for s in _SECTORES:
        try:
            _, cambio = _obtener_precio_y_cambio(s["ticker"])
            resultado.append({"sector": s["nombre"], "cambio_porcentaje": round(cambio, 2)})
        except HTTPException:
            resultado.append({"sector": s["nombre"], "cambio_porcentaje": None})
    return resultado


@ttl_cache(seconds=120)
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


@ttl_cache(seconds=600)
def obtener_ficha_empresa(ticker: str) -> dict:
    ticker = normalizar_ticker(ticker)
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
