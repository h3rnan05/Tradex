import logging
from decimal import Decimal

import yfinance as yf
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


def obtener_precio_actual(ticker: str) -> Decimal:
    ticker = ticker.upper().strip()
    precio = None
    try:
        precio = yf.Ticker(ticker).fast_info.get("last_price")
    except Exception:
        logger.exception("Error obteniendo fast_info para %s", ticker)

    if not precio:
        try:
            historial = yf.Ticker(ticker).history(period="1d")
            if not historial.empty:
                precio = historial["Close"].iloc[-1]
        except Exception:
            logger.exception("Error obteniendo history para %s", ticker)

    if not precio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontro el precio para el ticker {ticker}",
        )
    return Decimal(str(precio))
