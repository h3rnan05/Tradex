from decimal import Decimal

import yfinance as yf
from fastapi import HTTPException, status


def obtener_precio_actual(ticker: str) -> Decimal:
    ticker = ticker.upper().strip()
    try:
        info = yf.Ticker(ticker).fast_info
        precio = info.get("last_price")
    except Exception:
        precio = None

    if not precio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontro el precio para el ticker {ticker}",
        )
    return Decimal(str(precio))
