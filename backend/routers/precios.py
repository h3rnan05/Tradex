from fastapi import APIRouter, Depends

from auth_utils import get_current_user
from models.user import User
from precios_utils import obtener_precio_actual

router = APIRouter(prefix="/precios", tags=["precios"])


@router.get("/{ticker}")
def precio_actual(ticker: str, current_user: User = Depends(get_current_user)):
    precio = obtener_precio_actual(ticker)
    return {"ticker": ticker.upper(), "precio": precio}
