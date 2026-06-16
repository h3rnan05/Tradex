TIPOS_ACTIVO_VALIDOS = ["acciones", "indices", "commodities"]

TICKERS_INDICES = {"SPY", "QQQ", "DIA", "IWM", "VOO", "VTI", "EFA", "EEM"}
TICKERS_COMMODITIES = {"GLD", "SLV", "USO", "UNG", "DBA", "DBC", "PALL", "PPLT"}


def clasificar_ticker(ticker: str) -> str:
    ticker = ticker.upper().strip()
    if ticker in TICKERS_INDICES:
        return "indices"
    if ticker in TICKERS_COMMODITIES:
        return "commodities"
    return "acciones"
