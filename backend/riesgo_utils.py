import math


def calcular_retornos_diarios(serie_valores: list[float]) -> list[float]:
    if len(serie_valores) < 2:
        return []
    return [(serie_valores[i] - serie_valores[i - 1]) / serie_valores[i - 1] for i in range(1, len(serie_valores))]


def calcular_volatilidad_anualizada(retornos: list[float]) -> float:
    if len(retornos) < 2:
        return 0.0
    n = len(retornos)
    media = sum(retornos) / n
    varianza = sum((r - media) ** 2 for r in retornos) / (n - 1)
    return math.sqrt(varianza) * math.sqrt(252)


def calcular_sharpe_ratio(retornos: list[float], tasa_libre_riesgo: float = 0.05) -> float:
    if len(retornos) < 2:
        return 0.0
    vol = calcular_volatilidad_anualizada(retornos)
    if vol == 0:
        return 0.0
    rendimiento_anual = (sum(retornos) / len(retornos)) * 252
    return (rendimiento_anual - tasa_libre_riesgo) / vol


def calcular_metricas(serie_valores: list[dict]) -> dict:
    """serie_valores: [{"fecha": str, "valor": float}, ...]"""
    if len(serie_valores) < 3:
        return {"volatilidad_anualizada": None, "sharpe_ratio": None, "rendimiento_total_pct": None}

    valores = [p["valor"] for p in serie_valores]
    retornos = calcular_retornos_diarios(valores)
    vol = calcular_volatilidad_anualizada(retornos)
    sharpe = calcular_sharpe_ratio(retornos)
    rendimiento_total = (valores[-1] - valores[0]) / valores[0] * 100

    return {
        "volatilidad_anualizada": round(vol * 100, 2),
        "sharpe_ratio": round(sharpe, 2),
        "rendimiento_total_pct": round(rendimiento_total, 2),
    }
