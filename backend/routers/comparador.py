import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from auth_utils import get_current_user
from database import get_db
from models.user import User
from precios_utils import obtener_historial_precios
from riesgo_utils import calcular_metricas, calcular_retornos_diarios

router = APIRouter(prefix="/comparador", tags=["comparador"])

# Portfolio model compositions (conservative/moderate/aggressive)
_MODELOS = {
    "conservador": [("BND", 0.50), ("SPY", 0.30), ("GLD", 0.20)],
    "moderado": [("SPY", 0.60), ("BND", 0.30), ("QQQ", 0.10)],
    "agresivo": [("QQQ", 0.60), ("SPY", 0.25), ("ARKK", 0.15)],
}


def _get_sp500_serie(dias: int) -> list[dict]:
    try:
        return obtener_historial_precios("^GSPC", dias=dias)
    except Exception:
        return []


def _modelo_serie(nombre: str, dias: int, monto_base: float) -> list[dict]:
    composicion = _MODELOS.get(nombre, _MODELOS["moderado"])
    series: list[list[dict]] = []
    pesos: list[float] = []
    for ticker, peso in composicion:
        try:
            hist = obtener_historial_precios(ticker, dias=dias)
            if hist:
                series.append(hist)
                pesos.append(peso)
        except Exception:
            pass
    if not series:
        return []

    # Align dates to the shortest series
    fecha_set = set(p["fecha"] for p in series[0])
    for s in series[1:]:
        fecha_set &= set(p["fecha"] for p in s)
    fechas = sorted(fecha_set)

    resultado = []
    for fecha in fechas:
        valor = 0.0
        for i, serie in enumerate(series):
            pts = {p["fecha"]: p["precio"] for p in serie}
            base = {p["fecha"]: p["precio"] for p in serie}
            precio_base = list(base.values())[0] if base else 1
            precio_actual = pts.get(fecha, 0)
            valor += monto_base * pesos[i] * (precio_actual / precio_base if precio_base else 1)
        resultado.append({"fecha": fecha, "valor": round(valor, 2)})
    return resultado


@router.get("/{alumno_id}")
def comparar(
    alumno_id: uuid.UUID,
    grupo_id: uuid.UUID = Query(...),
    modelo: str = Query("moderado"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from routers.alumnos import historial_valor_portafolio

    serie_alumno = historial_valor_portafolio(alumno_id, grupo_id, db, current_user)
    if not serie_alumno:
        return {"alumno": [], "sp500": [], "modelo": [], "metricas": {}}

    dias = len(serie_alumno) + 30
    monto_base = serie_alumno[0]["valor"] if serie_alumno else 10000

    # S&P 500 normalised to same starting value
    sp500_raw = _get_sp500_serie(dias)
    if sp500_raw:
        fecha_inicio = serie_alumno[0]["fecha"]
        sp500_filt = [p for p in sp500_raw if p["fecha"] >= fecha_inicio]
        if sp500_filt:
            base_sp = sp500_filt[0]["precio"]
            sp500_serie = [{"fecha": p["fecha"], "valor": round(monto_base * p["precio"] / base_sp, 2)} for p in sp500_filt]
        else:
            sp500_serie = []
    else:
        sp500_serie = []

    modelo_serie = _modelo_serie(modelo, dias, monto_base)
    if modelo_serie:
        fecha_inicio = serie_alumno[0]["fecha"]
        modelo_serie = [p for p in modelo_serie if p["fecha"] >= fecha_inicio]

    metricas_alumno = calcular_metricas(serie_alumno)
    metricas_sp500 = calcular_metricas(sp500_serie) if sp500_serie else {}
    metricas_modelo = calcular_metricas(modelo_serie) if modelo_serie else {}

    return {
        "alumno": serie_alumno,
        "sp500": sp500_serie,
        "modelo": modelo_serie,
        "modelo_nombre": modelo,
        "metricas": {
            "alumno": metricas_alumno,
            "sp500": metricas_sp500,
            "modelo": metricas_modelo,
        },
    }
