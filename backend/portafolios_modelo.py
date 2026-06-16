PERFILES_RIESGO_VALIDOS = ["conservador", "moderado", "agresivo"]

PLANTILLAS_PORTAFOLIO = {
    "conservador": {
        "nombre": "Conservador",
        "descripcion": "Prioriza estabilidad: mayor peso en indices amplios y poca exposicion a acciones individuales.",
        "activos": [
            {"ticker": "SPY", "porcentaje": "0.50"},
            {"ticker": "GLD", "porcentaje": "0.20"},
            {"ticker": "AAPL", "porcentaje": "0.15"},
            {"ticker": "MSFT", "porcentaje": "0.15"},
        ],
    },
    "moderado": {
        "nombre": "Moderado",
        "descripcion": "Balance entre indices y acciones de crecimiento, con una pequena porcion de commodities.",
        "activos": [
            {"ticker": "SPY", "porcentaje": "0.30"},
            {"ticker": "QQQ", "porcentaje": "0.20"},
            {"ticker": "AAPL", "porcentaje": "0.15"},
            {"ticker": "MSFT", "porcentaje": "0.15"},
            {"ticker": "AMZN", "porcentaje": "0.10"},
            {"ticker": "GLD", "porcentaje": "0.10"},
        ],
    },
    "agresivo": {
        "nombre": "Agresivo",
        "descripcion": "Concentrado en acciones individuales de alto crecimiento, con minima diversificacion defensiva.",
        "activos": [
            {"ticker": "NVDA", "porcentaje": "0.25"},
            {"ticker": "TSLA", "porcentaje": "0.20"},
            {"ticker": "AMZN", "porcentaje": "0.15"},
            {"ticker": "META", "porcentaje": "0.15"},
            {"ticker": "GOOGL", "porcentaje": "0.15"},
            {"ticker": "QQQ", "porcentaje": "0.10"},
        ],
    },
}
