from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from auth_utils import get_current_user
from escenarios_historicos import ESCENARIOS_HISTORICOS
from limiter import limiter
from models.user import User
from precios_utils import (
    EXPLORADOR_CATEGORIAS,
    normalizar_ticker,
    obtener_explorador_categoria,
    obtener_earnings_calendar,
    obtener_ficha_empresa,
    obtener_historial_precios,
    obtener_historial_precios_rango,
    obtener_noticias,
    obtener_noticias_generales,
    obtener_precio_actual,
    obtener_precios_destacados,
    obtener_precios_indices,
    obtener_screener,
    obtener_trending,
    obtener_sectores,
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
@limiter.limit("30/minute")
def historial_escenario(
    request: Request,
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
@limiter.limit("30/minute")
def precios_destacados(request: Request, current_user: User = Depends(get_current_user)):
    return obtener_precios_destacados()


@router.get("/trending")
@limiter.limit("20/minute")
def trending(request: Request, current_user: User = Depends(get_current_user)):
    return obtener_trending()


@router.get("/categorias")
@limiter.limit("60/minute")
def categorias_activos(request: Request, current_user: User = Depends(get_current_user)):
    """Lista estática (sin precios en vivo) de los activos de cada categoría.
    Útil para mostrar al maestro qué instrumentos incluye cada mercado."""
    return EXPLORADOR_CATEGORIAS


@router.get("/explorador/{categoria}")
@limiter.limit("30/minute")
def explorador_categoria(
    request: Request,
    categoria: str,
    current_user: User = Depends(get_current_user),
):
    return obtener_explorador_categoria(categoria)


@router.get("/noticias-generales")
@limiter.limit("20/minute")
def noticias_generales_mercado(request: Request, current_user: User = Depends(get_current_user)):
    return {"noticias": obtener_noticias_generales()}


@router.get("/indices")
@limiter.limit("30/minute")
def indices_mercado(request: Request, current_user: User = Depends(get_current_user)):
    return obtener_precios_indices()


@router.get("/earnings-calendar")
@limiter.limit("10/minute")
def earnings_calendar(request: Request, current_user: User = Depends(get_current_user)):
    return obtener_earnings_calendar()


@router.get("/sectores")
@limiter.limit("20/minute")
def sectores_mercado(request: Request, current_user: User = Depends(get_current_user)):
    return obtener_sectores()


@router.get("/screener")
@limiter.limit("20/minute")
def screener(
    request: Request,
    tipo: str = Query(default="most_actives"),
    current_user: User = Depends(get_current_user),
):
    return obtener_screener(tipo)


@router.get("/{ticker}")
@limiter.limit("60/minute")
def precio_actual(request: Request, ticker: str, current_user: User = Depends(get_current_user)):
    precio = obtener_precio_actual(ticker)
    return {"ticker": normalizar_ticker(ticker), "precio": precio}


@router.get("/{ticker}/historial")
@limiter.limit("30/minute")
def historial_precio(
    request: Request,
    ticker: str,
    dias: int = Query(default=30, ge=1, le=1825),
    current_user: User = Depends(get_current_user),
):
    historial = obtener_historial_precios(ticker, dias=dias)
    return {"ticker": normalizar_ticker(ticker), "historial": historial}


@router.get("/{ticker}/noticias")
@limiter.limit("20/minute")
def noticias_ticker(request: Request, ticker: str, current_user: User = Depends(get_current_user)):
    noticias = obtener_noticias(ticker)
    return {"ticker": normalizar_ticker(ticker), "noticias": noticias}


@router.get("/{ticker}/ficha")
@limiter.limit("20/minute")
def ficha_empresa(request: Request, ticker: str, current_user: User = Depends(get_current_user)):
    return obtener_ficha_empresa(ticker)
