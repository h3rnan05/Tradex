from datetime import datetime, timezone

from fastapi import HTTPException, status

TIPOS_ACTIVO_VALIDOS = ["acciones", "indices", "commodities", "crypto"]

TICKERS_INDICES = {"SPY", "QQQ", "DIA", "IWM", "VOO", "VTI", "EFA", "EEM"}
TICKERS_COMMODITIES = {"GLD", "SLV", "USO", "UNG", "DBA", "DBC", "PALL", "PPLT"}


def clasificar_ticker(ticker: str) -> str:
    ticker = ticker.upper().strip()
    # Las criptomonedas en Yahoo Finance usan el sufijo -USD (ej. BTC-USD, ETH-USD)
    if ticker.endswith("-USD"):
        return "crypto"
    if ticker in TICKERS_INDICES:
        return "indices"
    if ticker in TICKERS_COMMODITIES:
        return "commodities"
    return "acciones"


def validar_activos_permitidos(activos_permitidos: list[str]) -> list[str]:
    invalidos = [a for a in (activos_permitidos or []) if a not in TIPOS_ACTIVO_VALIDOS]
    if invalidos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipos de activo inválidos: {', '.join(invalidos)}. "
            f"Opciones válidas: {', '.join(TIPOS_ACTIVO_VALIDOS)}",
        )
    return activos_permitidos


def activo_desbloqueado(tipo_activo: str, activos_permitidos: list[str], fases_activo: list) -> bool:
    if tipo_activo not in (activos_permitidos or []):
        return False
    fase = next((f for f in fases_activo if f.tipo_activo == tipo_activo), None)
    if fase is None:
        return True
    return datetime.now(timezone.utc) >= fase.fecha_activacion


def separar_activos_por_disponibilidad(activos_permitidos: list[str], fases_activo: list) -> tuple[list[str], list[dict]]:
    ahora = datetime.now(timezone.utc)
    disponibles = []
    proximos = []
    for tipo in activos_permitidos or []:
        fase = next((f for f in fases_activo if f.tipo_activo == tipo), None)
        if fase is None or ahora >= fase.fecha_activacion:
            disponibles.append(tipo)
        else:
            proximos.append({"tipo_activo": tipo, "fecha_activacion": fase.fecha_activacion.isoformat()})
    return disponibles, proximos
