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
}


def obtener_escenario(escenario_id: str) -> dict:
    escenario = ESCENARIOS_HISTORICOS.get(escenario_id)
    if not escenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escenario no encontrado")
    return escenario


def precio_simulado(ticker: str, escenario_id: str, fecha_inicio_reto: datetime, fecha_fin_reto: datetime) -> Decimal:
    escenario = obtener_escenario(escenario_id)
    historial = obtener_historial_precios_rango(ticker, escenario["fecha_inicio"], escenario["fecha_fin"])

    ahora = datetime.now(timezone.utc)
    duracion = (fecha_fin_reto - fecha_inicio_reto).total_seconds()
    progreso = (ahora - fecha_inicio_reto).total_seconds() / duracion if duracion > 0 else 1
    progreso = max(0.0, min(1.0, progreso))

    indice = int(progreso * (len(historial) - 1))
    return Decimal(str(historial[indice]["precio"]))
