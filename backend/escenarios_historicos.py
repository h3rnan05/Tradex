from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status

from precios_utils import obtener_historial_precios_rango

ESCENARIOS_HISTORICOS = {
    "covid_2020": {
        "nombre": "Crash y recuperacion COVID-19",
        "descripcion": "El mercado cayo mas de 30% en semanas por la pandemia y se recupero con fuerza hacia fin de ano.",
        "fecha_inicio": date(2020, 2, 1),
        "fecha_fin": date(2020, 12, 31),
        "tickers_sugeridos": ["SPY", "AAPL", "AMZN", "TSLA", "ZM", "NFLX", "UAL", "CCL", "BA"],
    },
    "inflacion_2022": {
        "nombre": "Selloff tecnologico 2022",
        "descripcion": "La inflacion y las subidas de tasas de la Fed provocaron una fuerte caida en acciones tecnologicas y de crecimiento.",
        "fecha_inicio": date(2022, 1, 1),
        "fecha_fin": date(2022, 12, 31),
        "tickers_sugeridos": ["QQQ", "META", "NFLX", "TSLA", "NVDA", "AMZN", "COIN"],
    },
    "rally_ia_2023": {
        "nombre": "Rally de inteligencia artificial",
        "descripcion": "El auge de la IA generativa impulso a las acciones tecnologicas, liderado por semiconductores.",
        "fecha_inicio": date(2023, 1, 1),
        "fecha_fin": date(2023, 12, 31),
        "tickers_sugeridos": ["NVDA", "MSFT", "GOOGL", "AMD", "META", "AMZN", "SMCI"],
    },
    "crisis_2008": {
        "nombre": "Crisis financiera de 2008",
        "descripcion": "El colapso de las hipotecas subprime y la quiebra de Lehman Brothers hundieron a los mercados; el S&P 500 cayo mas de 50% antes de tocar fondo en marzo de 2009.",
        "fecha_inicio": date(2008, 9, 1),
        "fecha_fin": date(2009, 6, 30),
        "tickers_sugeridos": ["SPY", "XLF", "JPM", "GE", "BAC", "C", "GS", "MS", "F"],
    },
    "puntocom_2000": {
        "nombre": "Estallido de la burbuja puntocom",
        "descripcion": "La euforia por las empresas de internet se desplomo entre 2000 y 2002; el Nasdaq perdio cerca del 78% de su valor antes de recuperarse en 2003.",
        "fecha_inicio": date(2000, 3, 1),
        "fecha_fin": date(2003, 12, 31),
        "tickers_sugeridos": ["QQQ", "MSFT", "INTC", "CSCO", "AMZN", "ORCL", "AAPL", "EBAY"],
    },
    "lunes_negro_1987": {
        "nombre": "Lunes Negro de 1987",
        "descripcion": "El 19 de octubre de 1987 el Dow Jones cayo 22% en un solo dia, el mayor desplome porcentual diario de la historia; el mercado se recupero a lo largo de 1988.",
        "fecha_inicio": date(1987, 9, 1),
        "fecha_fin": date(1988, 12, 31),
        "tickers_sugeridos": ["^GSPC", "^DJI", "IBM", "KO", "GE", "XOM", "MCD"],
    },
    "bancos_2023": {
        "nombre": "Crisis bancaria de 2023",
        "descripcion": "La quiebra de Silicon Valley Bank desato el panico sobre los bancos regionales de EE.UU. en marzo de 2023; el sector rebotó parcialmente hacia el verano.",
        "fecha_inicio": date(2023, 3, 1),
        "fecha_fin": date(2023, 9, 30),
        "tickers_sugeridos": ["KRE", "XLF", "SCHW", "JPM", "BAC", "WFC", "C", "COF"],
    },
}


# Cabecera del periódico ficticio que narra cada escenario.
NOTICIERO = "TRADEX TIMES"

# Titulares por escenario. Cada uno se "publica" cuando el reto alcanza su
# umbral de progreso, narrando la caída (1ª mitad) y la recuperación (2ª mitad).
NOTICIAS_ESCENARIOS: dict[str, list[dict]] = {
    "crisis_2008": [
        {"progreso": 0.0, "fecha": "15 SEP 2008", "titular": "Lehman Brothers se declara en quiebra", "cuerpo": "El cuarto banco de inversión de Wall Street colapsa con 600 mil mdd en deuda. El pánico se apodera de los mercados."},
        {"progreso": 0.15, "fecha": "16 SEP 2008", "titular": "La Fed rescata a la aseguradora AIG con 85 mil mdd", "cuerpo": "El gobierno toma el control para evitar un efecto dominó en todo el sistema financiero."},
        {"progreso": 0.3, "fecha": "29 SEP 2008", "titular": "El Dow Jones se hunde 777 puntos en un solo día", "cuerpo": "La mayor caída en puntos de su historia tras el rechazo inicial del plan de rescate en el Congreso."},
        {"progreso": 0.45, "fecha": "OCT 2008", "titular": "Crédito congelado: los bancos dejan de prestarse entre sí", "cuerpo": "El miedo paraliza la economía. Las bolsas de todo el mundo se desploman día tras día."},
        {"progreso": 0.5, "fecha": "9 MAR 2009", "titular": "Los mercados tocan fondo: mínimos de 12 años", "cuerpo": "El S&P 500 acumula una caída superior al 50%. La desesperación es total... ¿es el momento de comprar?"},
        {"progreso": 0.65, "fecha": "ABR 2009", "titular": "Wall Street rebota con fuerza", "cuerpo": "Arranca el mayor rally desde la Gran Depresión. Quienes compraron en el fondo empiezan a recuperar."},
        {"progreso": 0.85, "fecha": "JUN 2009", "titular": "Señales de recuperación: los bancos devuelven el rescate", "cuerpo": "La confianza regresa lentamente. El mercado deja atrás lo peor de la crisis."},
    ],
    "covid_2020": [
        {"progreso": 0.0, "fecha": "FEB 2020", "titular": "Crece el temor por un nuevo coronavirus", "cuerpo": "Los casos se multiplican fuera de China. Los inversores empiezan a inquietarse."},
        {"progreso": 0.2, "fecha": "9 MAR 2020", "titular": "Lunes negro: el petróleo se hunde y las bolsas caen", "cuerpo": "Se activan los cortacircuitos en Wall Street por primera vez en años."},
        {"progreso": 0.4, "fecha": "16 MAR 2020", "titular": "El peor día desde 1987 por la pandemia", "cuerpo": "El mundo entra en confinamiento. La economía se detiene de golpe."},
        {"progreso": 0.5, "fecha": "23 MAR 2020", "titular": "La Fed anuncia estímulos ilimitados", "cuerpo": "El banco central promete hacer 'lo que sea necesario'. Los mercados tocan fondo."},
        {"progreso": 0.7, "fecha": "JUN 2020", "titular": "Rebote histórico liderado por las tecnológicas", "cuerpo": "El trabajo remoto dispara a empresas como Zoom y Amazon mientras aerolíneas y cruceros sufren."},
        {"progreso": 0.9, "fecha": "NOV 2020", "titular": "Las vacunas impulsan a los mercados a máximos", "cuerpo": "La recuperación en forma de V sorprende a todos. Récords históricos en los índices."},
    ],
    "puntocom_2000": [
        {"progreso": 0.0, "fecha": "10 MAR 2000", "titular": "El Nasdaq alcanza un máximo histórico de 5,048 puntos", "cuerpo": "La euforia por internet no tiene límites. Cualquier empresa con '.com' se dispara en bolsa."},
        {"progreso": 0.15, "fecha": "ABR 2000", "titular": "Viernes negro tecnológico: el Nasdaq cae 9% en un día", "cuerpo": "Las dudas sobre las valoraciones de las puntocom empiezan a pasar factura."},
        {"progreso": 0.3, "fecha": "2001", "titular": "Las puntocom queman su efectivo y cierran por cientos", "cuerpo": "Startups sin ganancias reales desaparecen. El sueño de internet se desinfla."},
        {"progreso": 0.45, "fecha": "SEP 2001", "titular": "Los mercados caen tras los atentados del 11-S", "cuerpo": "La incertidumbre golpea a una economía ya debilitada."},
        {"progreso": 0.5, "fecha": "9 OCT 2002", "titular": "El Nasdaq toca fondo: -78% desde su máximo", "cuerpo": "Tres años de destrucción de riqueza. Las tecnológicas sobrevivientes cotizan por los suelos."},
        {"progreso": 0.7, "fecha": "2003", "titular": "Inicia la recuperación tecnológica", "cuerpo": "Los líderes que sobrevivieron empiezan a crecer de nuevo, ahora con modelos rentables."},
        {"progreso": 0.9, "fecha": "DIC 2003", "titular": "Un nuevo ciclo alcista para la tecnología", "cuerpo": "Amazon, Apple y otros sientan las bases de la siguiente década dorada."},
    ],
    "lunes_negro_1987": [
        {"progreso": 0.0, "fecha": "SEP 1987", "titular": "Wall Street en máximos tras cinco años alcistas", "cuerpo": "El optimismo domina, pero algunos advierten que las valoraciones están demasiado altas."},
        {"progreso": 0.25, "fecha": "16 OCT 1987", "titular": "Crece el nerviosismo: fuertes pérdidas en la semana", "cuerpo": "Los programas de venta automática empiezan a presionar al mercado."},
        {"progreso": 0.5, "fecha": "19 OCT 1987", "titular": "LUNES NEGRO: el Dow se desploma 22.6% en un día", "cuerpo": "El mayor desplome porcentual diario de la historia. El pánico es absoluto en el parqué."},
        {"progreso": 0.6, "fecha": "20 OCT 1987", "titular": "La Fed inunda de liquidez para frenar el pánico", "cuerpo": "El banco central promete apoyo total al sistema financiero. El mercado empieza a estabilizarse."},
        {"progreso": 0.75, "fecha": "NOV 1987", "titular": "El mercado se estabiliza tras el desplome", "cuerpo": "La calma regresa poco a poco. Quienes mantuvieron la sangre fría empiezan a recuperar."},
        {"progreso": 0.9, "fecha": "1988", "titular": "Wall Street recupera terreno a lo largo del año", "cuerpo": "El crash resulta ser un evento puntual; los fundamentos de la economía siguen sólidos."},
    ],
    "bancos_2023": [
        {"progreso": 0.0, "fecha": "8 MAR 2023", "titular": "Silicon Valley Bank busca capital de emergencia", "cuerpo": "El banco de las startups anuncia pérdidas en su cartera de bonos. Cunde la preocupación."},
        {"progreso": 0.2, "fecha": "10 MAR 2023", "titular": "Colapsa SVB, la mayor quiebra bancaria desde 2008", "cuerpo": "Una corrida de depósitos hunde al banco en 48 horas. Los reguladores intervienen."},
        {"progreso": 0.35, "fecha": "12 MAR 2023", "titular": "Garantizan los depósitos y cierran Signature Bank", "cuerpo": "Las autoridades actúan para frenar el contagio a otros bancos regionales."},
        {"progreso": 0.5, "fecha": "19 MAR 2023", "titular": "UBS compra Credit Suisse en un rescate de emergencia", "cuerpo": "La crisis cruza el Atlántico. El miedo bancario alcanza su punto máximo."},
        {"progreso": 0.6, "fecha": "1 MAY 2023", "titular": "First Republic cae y es absorbido por JPMorgan", "cuerpo": "El último gran susto de la crisis. A partir de aquí el sector empieza a calmarse."},
        {"progreso": 0.8, "fecha": "JUL 2023", "titular": "El sector bancario regional se estabiliza", "cuerpo": "Los depósitos se estabilizan y la confianza regresa lentamente al sistema."},
    ],
    "inflacion_2022": [
        {"progreso": 0.0, "fecha": "ENE 2022", "titular": "La inflación alcanza máximos de 40 años", "cuerpo": "Los precios se disparan en EE.UU. La Fed se prepara para actuar con dureza."},
        {"progreso": 0.2, "fecha": "MAR 2022", "titular": "La Fed inicia el ciclo de subidas más agresivo en décadas", "cuerpo": "El dinero barato se acaba. Las acciones de crecimiento empiezan a sufrir."},
        {"progreso": 0.35, "fecha": "MAY 2022", "titular": "Las tecnológicas se desploman ante el alza de tasas", "cuerpo": "Netflix, Meta y otras pierden buena parte de su valor en cuestión de meses."},
        {"progreso": 0.5, "fecha": "JUN 2022", "titular": "El S&P 500 entra en mercado bajista", "cuerpo": "Caída superior al 20% desde máximos. El pesimismo domina a los inversores."},
        {"progreso": 0.7, "fecha": "OCT 2022", "titular": "Los mercados buscan un fondo tras un año brutal", "cuerpo": "Aparecen señales de que la inflación podría haber tocado techo."},
        {"progreso": 0.9, "fecha": "DIC 2022", "titular": "Tímida recuperación de fin de año", "cuerpo": "El mercado descuenta que lo peor del ajuste podría haber quedado atrás."},
    ],
    "rally_ia_2023": [
        {"progreso": 0.0, "fecha": "ENE 2023", "titular": "Las bolsas arrancan el año con optimismo", "cuerpo": "Tras un 2022 difícil, los inversores vuelven a apostar por la tecnología."},
        {"progreso": 0.25, "fecha": "FEB 2023", "titular": "ChatGPT desata la fiebre por la inteligencia artificial", "cuerpo": "El auge de la IA generativa pone a las tecnológicas en el centro de todas las miradas."},
        {"progreso": 0.5, "fecha": "MAY 2023", "titular": "Nvidia sorprende con resultados récord por la IA", "cuerpo": "La demanda de chips para IA dispara a la empresa hacia el club del billón de dólares."},
        {"progreso": 0.75, "fecha": "JUL 2023", "titular": "Las tecnológicas lideran el mejor semestre en años", "cuerpo": "Los 'siete magníficos' impulsan al mercado al alza con fuerza."},
        {"progreso": 0.9, "fecha": "NOV 2023", "titular": "El rally de la IA lleva a máximos a los gigantes tech", "cuerpo": "El entusiasmo por la inteligencia artificial no da señales de agotarse."},
    ],
}


def noticias_escenario(escenario_id: str, progreso: float) -> list[dict]:
    """Titulares ya 'publicados' al progreso actual del reto, del más reciente
    al más antiguo. Si el escenario no tiene noticias, devuelve lista vacía."""
    titulares = NOTICIAS_ESCENARIOS.get(escenario_id, [])
    publicadas = [n for n in titulares if n["progreso"] <= progreso]
    return sorted(publicadas, key=lambda n: n["progreso"], reverse=True)


def obtener_escenario(escenario_id: str) -> dict:
    escenario = ESCENARIOS_HISTORICOS.get(escenario_id)
    if not escenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escenario no encontrado")
    return escenario


# Caché de series históricas por (escenario_id, ticker). Las series son fijas
# (datos del pasado), así que basta con descargarlas una vez por proceso.
_CACHE_HISTORIAL: dict[tuple[str, str], list] = {}


def _historial_escenario(escenario_id: str, ticker: str) -> list:
    clave = (escenario_id, ticker.upper())
    if clave not in _CACHE_HISTORIAL:
        escenario = obtener_escenario(escenario_id)
        try:
            serie = obtener_historial_precios_rango(ticker, escenario["fecha_inicio"], escenario["fecha_fin"])
        except Exception:
            serie = []
        _CACHE_HISTORIAL[clave] = serie or []
    return _CACHE_HISTORIAL[clave]


def _progreso(fecha_inicio_reto: datetime, fecha_fin_reto: datetime) -> float:
    ahora = datetime.now(timezone.utc)
    duracion = (fecha_fin_reto - fecha_inicio_reto).total_seconds()
    progreso = (ahora - fecha_inicio_reto).total_seconds() / duracion if duracion > 0 else 1
    return max(0.0, min(1.0, progreso))


def _indice_arco(historial: list, progreso: float) -> int:
    """Mapea el avance del reto a un indice del historial con forma de arco:
    el FONDO (precio minimo) del escenario cae justo a la mitad del reto. Asi la
    primera mitad es siempre la caida hacia el fondo y la segunda es la
    recuperacion, sin importar la duracion elegida por el maestro."""
    n = len(historial)
    if n <= 1:
        return 0
    idx_fondo = min(range(n), key=lambda i: historial[i]["precio"])

    # Si el fondo coincide con un extremo, degeneramos a mapeo lineal.
    if idx_fondo <= 0 or idx_fondo >= n - 1:
        indice = int(progreso * (n - 1))
        return max(0, min(indice, n - 1))

    if progreso <= 0.5:
        frac = progreso / 0.5
        indice = int(round(frac * idx_fondo))
    else:
        frac = (progreso - 0.5) / 0.5
        indice = int(round(idx_fondo + frac * (n - 1 - idx_fondo)))
    return max(0, min(indice, n - 1))


def precio_simulado(ticker: str, escenario_id: str, fecha_inicio_reto: datetime, fecha_fin_reto: datetime) -> Decimal:
    historial = _historial_escenario(escenario_id, ticker)
    if not historial:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No hay datos historicos de {ticker} para este escenario",
        )

    progreso = _progreso(fecha_inicio_reto, fecha_fin_reto)
    indice = _indice_arco(historial, progreso)
    return Decimal(str(historial[indice]["precio"]))


def precio_y_cambio_simulado(
    ticker: str, escenario_id: str, fecha_inicio_reto: datetime, fecha_fin_reto: datetime
) -> tuple[Decimal, float, float]:
    """Precio simulado actual del ticker (siguiendo el arco caida->recuperacion),
    variacion porcentual acumulada desde el inicio del reto, y la caida MAXIMA
    del escenario (del inicio al fondo). El cambio_total = caida maxima sirve
    para mostrar desde el arranque cuán profundo sera el crash."""
    historial = _historial_escenario(escenario_id, ticker)
    if not historial:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No hay datos historicos de {ticker} para este escenario",
        )

    progreso = _progreso(fecha_inicio_reto, fecha_fin_reto)
    indice = _indice_arco(historial, progreso)

    precio = Decimal(str(historial[indice]["precio"]))
    precio_inicial = Decimal(str(historial[0]["precio"]))
    precio_fondo = Decimal(str(min(h["precio"] for h in historial)))
    cambio = float((precio - precio_inicial) / precio_inicial * 100) if precio_inicial else 0.0
    caida_maxima = float((precio_fondo - precio_inicial) / precio_inicial * 100) if precio_inicial else 0.0
    return precio, cambio, caida_maxima
