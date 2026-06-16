from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth_utils import get_current_user
from escenarios_historicos import ESCENARIOS_HISTORICOS
from models.user import User
from precios_utils import (
    obtener_historial_precios,
    obtener_historial_precios_rango,
    obtener_noticias,
    obtener_noticias_generales,
    obtener_precio_actual,
    obtener_precios_destacados,
    obtener_precios_indices,
)

router = APIRouter(prefix="/precios", tags=["precios"])


@router.get("/escenarios")
def listar_escenarios(current_user: User = Depends(get_current_user)):
    return [
        {
            "id": id_escenario,
            "nombre": escenario["nombre"],
            "descripcion": escenario["descripcion"],
            "fecha_inicio": escenario["fecha_inicio"].isoformat(),
            "fecha_fin": escenario["fecha_fin"].isoformat(),
            "tickers_sugeridos": escenario["tickers_sugeridos"],
        }
        for id_escenario, escenario in ESCENARIOS_HISTORICOS.items()
    ]


@router.get("/escenarios/{escenario_id}/historial")
def historial_escenario(
    escenario_id: str,
    ticker: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    escenario = ESCENARIOS_HISTORICOS.get(escenario_id)
    if not escenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escenario no encontrado")

    historial = obtener_historial_precios_rango(ticker, escenario["fecha_inicio"], escenario["fecha_fin"])
    precio_inicial = historial[0]["precio"]
    precio_final = historial[-1]["precio"]
    rendimiento_porcentaje = ((precio_final - precio_inicial) / precio_inicial * 100) if precio_inicial else 0

    return {
        "ticker": ticker.upper(),
        "escenario_id": escenario_id,
        "historial": historial,
        "rendimiento_porcentaje": rendimiento_porcentaje,
    }


@router.get("/destacados")
def precios_destacados(current_user: User = Depends(get_current_user)):
    return obtener_precios_destacados()


@router.get("/noticias-generales")
def noticias_generales_mercado(current_user: User = Depends(get_current_user)):
    return {"noticias": obtener_noticias_generales()}


@router.get("/indices")
def indices_mercado(current_user: User = Depends(get_current_user)):
    return obtener_precios_indices()


@router.get("/{ticker}")
def precio_actual(ticker: str, current_user: User = Depends(get_current_user)):
    precio = obtener_precio_actual(ticker)
    return {"ticker": ticker.upper(), "precio": precio}


@router.get("/{ticker}/historial")
def historial_precio(
    ticker: str,
    dias: int = Query(default=30, ge=1, le=1825),
    current_user: User = Depends(get_current_user),
):
    historial = obtener_historial_precios(ticker, dias=dias)
    return {"ticker": ticker.upper(), "historial": historial}


@router.get("/{ticker}/noticias")
def noticias_ticker(ticker: str, current_user: User = Depends(get_current_user)):
    noticias = obtener_noticias(ticker)
    return {"ticker": ticker.upper(), "noticias": noticias}
