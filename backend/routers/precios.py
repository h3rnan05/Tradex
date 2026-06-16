from fastapi import APIRouter, Depends, Query

from auth_utils import get_current_user
from models.user import User
from precios_utils import obtener_historial_precios, obtener_precio_actual

router = APIRouter(prefix="/precios", tags=["precios"])


@router.get("/{ticker}")
def precio_actual(ticker: str, current_user: User = Depends(get_current_user)):
    precio = obtener_precio_actual(ticker)
    return {"ticker": ticker.upper(), "precio": precio}


@router.get("/{ticker}/historial")
def historial_precio(
    ticker: str,
    dias: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
):
    historial = obtener_historial_precios(ticker, dias=dias)
    return {"ticker": ticker.upper(), "historial": historial}
