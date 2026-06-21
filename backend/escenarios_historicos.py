from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status

from precios_utils import obtener_historial_precios_rango

ESCENARIOS_HISTORICOS = {
    "covid_2020": {
        "nombre": "Crash y recuperacion COVID-19",
        "descripcion": "El mercado cayo mas de 30% en semanas por la pandemia y se recupero con fuerza hacia fin de ano.",
        "fecha_inicio": date(2020, 2, 1),
        "fecha_fin": date(2020, 12, 31),
        "tickers_sugeridos": ["SPY", "AAPL", "AMZN", "TSLA"],
    },
    "inflacion_2022": {
        "nombre": "Selloff tecnologico 2022",
        "descripcion": "La inflacion y las subidas de tasas de la Fed provocaron una fuerte caida en acciones tecnologicas y de crecimiento.",
        "fecha_inicio": date(2022, 1, 1),
        "fecha_fin": date(2022, 12, 31),
        "tickers_sugeridos": ["QQQ", "META", "NFLX", "TSLA"],
    },
    "rally_ia_2023": {
        "nombre": "Rally de inteligencia artificial",
        "descripcion": "El auge de la IA generativa impulso a las acciones tecnologicas, liderado por semiconductores.",
        "fecha_inicio": date(2023, 1, 1),
        "fecha_fin": date(2023, 12, 31),
        "tickers_sugeridos": ["NVDA", "MSFT", "GOOGL", "AMD"],
    },
    "crisis_2008": {
        "nombre": "Crisis financiera de 2008",
        "descripcion": "El colapso de las hipotecas subprime y la quiebra de Lehman Brothers hundieron a los mercados; el S&P 500 cayo mas de 50% antes de tocar fondo en marzo de 2009.",
        "fecha_inicio": date(2008, 9, 1),
        "fecha_fin": date(2009, 6, 30),
        "tickers_sugeridos": ["SPY", "XLF", "JPM", "GE"],
    },
    "puntocom_2000": {
        "nombre": "Estallido de la burbuja puntocom",
        "descripcion": "La euforia por las empresas de internet se desplomo entre 2000 y 2002; el Nasdaq perdio cerca del 78% de su valor.",
        "fecha_inicio": date(2000, 3, 1),
        "fecha_fin": date(2002, 10, 31),
        "tickers_sugeridos": ["QQQ", "MSFT", "INTC", "CSCO"],
    },
    "lunes_negro_1987": {
        "nombre": "Lunes Negro de 1987",
        "descripcion": "El 19 de octubre de 1987 el Dow Jones cayo 22% en un solo dia, el mayor desplome porcentual diario de la historia.",
        "fecha_inicio": date(1987, 9, 1),
        "fecha_fin": date(1987, 12, 31),
        "tickers_sugeridos": ["^GSPC", "^DJI", "IBM"],
    },
    "bancos_2023": {
        "nombre": "Crisis bancaria de 2023",
        "descripcion": "La quiebra de Silicon Valley Bank desato el panico sobre los bancos regionales de EE.UU. en marzo de 2023.",
        "fecha_inicio": date(2023, 3, 1),
        "fecha_fin": date(2023, 5, 31),
        "tickers_sugeridos": ["KRE", "XLF", "SCHW", "JPM"],
    },
}


def obtener_escenario(escenario_id: str) -> dict:
    escenario = ESCENARIOS_HISTORICOS.get(escenario_id)
    if not escenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escenario no encontrado")
    return escenario


# Caché de series históricas por (escenario_id, ticker). Las series son fijas
# (datos del pasado), así que basta con descargarlas una vez por proceso.
_CACHE_HISTORIAL: dict[tuple[str, str], list] = {}


def _historial_escenario(escenario_id: str, ticker: str) -> list:
    clave = (escenario_id, ticker.upper())
    if clave not in _CACHE_HISTORIAL:
        escenario = obtener_escenario(escenario_id)
        try:
            serie = obtener_historial_precios_rango(ticker, escenario["fecha_inicio"], escenario["fecha_fin"])
        except Exception:
            serie = []
        _CACHE_HISTORIAL[clave] = serie or []
    return _CACHE_HISTORIAL[clave]


def precio_simulado(ticker: str, escenario_id: str, fecha_inicio_reto: datetime, fecha_fin_reto: datetime) -> Decimal:
    historial = _historial_escenario(escenario_id, ticker)
    if not historial:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No hay datos historicos de {ticker} para este escenario",
        )

    ahora = datetime.now(timezone.utc)
    duracion = (fecha_fin_reto - fecha_inicio_reto).total_seconds()
    progreso = (ahora - fecha_inicio_reto).total_seconds() / duracion if duracion > 0 else 1
    progreso = max(0.0, min(1.0, progreso))

    indice = int(progreso * (len(historial) - 1))
    indice = max(0, min(indice, len(historial) - 1))
    return Decimal(str(historial[indice]["precio"]))
