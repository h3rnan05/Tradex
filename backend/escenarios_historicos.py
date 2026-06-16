from datetime import date

ESCENARIOS_HISTORICOS = {
    "covid_2020": {
        "nombre": "Crash y recuperacion COVID-19",
        "descripcion": "El mercado cayo mas de 30% en semanas por la pandemia y se recupero con fuerza hacia fin de ano.",
        "fecha_inicio": date(2020, 2, 1),
        "fecha_fin": date(2020, 12, 31),
        "tickers_sugeridos": ["SPY", "AAPL", "AMZN", "TSLA"],
    },
    "inflacion_2022": {
        "nombre": "Selloff tecnologico 2022",
        "descripcion": "La inflacion y las subidas de tasas de la Fed provocaron una fuerte caida en acciones tecnologicas y de crecimiento.",
        "fecha_inicio": date(2022, 1, 1),
        "fecha_fin": date(2022, 12, 31),
        "tickers_sugeridos": ["QQQ", "META", "NFLX", "TSLA"],
    },
    "rally_ia_2023": {
        "nombre": "Rally de inteligencia artificial",
        "descripcion": "El auge de la IA generativa impulso a las acciones tecnologicas, liderado por semiconductores.",
        "fecha_inicio": date(2023, 1, 1),
        "fecha_fin": date(2023, 12, 31),
        "tickers_sugeridos": ["NVDA", "MSFT", "GOOGL", "AMD"],
    },
}
