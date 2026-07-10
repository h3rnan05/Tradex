"""Motor de progreso: XP y niveles del alumno.

El XP se calcula de forma DETERMINISTA a partir de datos que ya existen
(órdenes ejecutadas e insignias obtenidas), por lo que no requiere tabla nueva
ni migración: el mismo estado siempre produce el mismo XP. Esto hace el sistema
robusto y fácil de razonar — el progreso "se gana" sin riesgo de doble conteo.
"""
import uuid

from sqlalchemy.orm import Session

from insignias_engine import BADGES
from models.insignia import InsigniaAlumno
from models.orden import Orden

# XP por operación ejecutada.
XP_POR_ORDEN = 10

# XP por insignia según su rareza. Mapea el "nivel" de la insignia.
XP_POR_RAREZA = {
    "facil": 50,
    "medio": 120,
    "dificil": 300,
    "legendario": 800,
}

# Nombre visible de cada rareza (tono pro, no infantil).
RAREZA_NOMBRE = {
    "facil": "bronce",
    "medio": "plata",
    "dificil": "oro",
    "legendario": "diamante",
}

# Títulos por rango de nivel — progresión aspiracional.
_TITULOS = [
    (1, "Novato"),
    (3, "Aprendiz"),
    (5, "Operador"),
    (8, "Trader"),
    (12, "Estratega"),
    (16, "Maestro del Mercado"),
    (20, "Leyenda"),
]


def titulo_para_nivel(nivel: int) -> str:
    titulo = _TITULOS[0][1]
    for umbral, nombre in _TITULOS:
        if nivel >= umbral:
            titulo = nombre
        else:
            break
    return titulo


def calcular_nivel(xp_total: int) -> dict:
    """Convierte XP acumulado en nivel + progreso dentro del nivel.

    Cada nivel exige ~35% más XP que el anterior (curva clásica de RPG):
    el avance es rápido al inicio y se vuelve un reto sostenido después.
    """
    nivel = 1
    requerido = 100          # XP para pasar de nivel 1 → 2
    acumulado = 0            # XP total al inicio del nivel actual
    while xp_total >= acumulado + requerido:
        acumulado += requerido
        nivel += 1
        requerido = int(requerido * 1.35)
    return {
        "nivel": nivel,
        "xp_total": xp_total,
        "xp_en_nivel": xp_total - acumulado,
        "xp_para_siguiente": requerido,
        "titulo": titulo_para_nivel(nivel),
    }


def calcular_comision(comision_base: int, nivel: int) -> float:
    """
    Returns the commission rate as a fraction (0.01 = 1%).
    - Novato/Bronce (nivel < 8): full rate
    - Plata (nivel 8-11): half rate
    - Oro/Diamante (nivel >= 12): 0.1x rate
    """
    rate = comision_base / 100.0
    if nivel >= 12:
        return rate * 0.1
    if nivel >= 8:
        return rate * 0.5
    return rate


def calcular_progreso(db: Session, alumno_id: uuid.UUID, grupo_id: uuid.UUID | None = None) -> dict:
    """Calcula XP, nivel y desglose de insignias por rareza para un alumno."""
    q_ordenes = db.query(Orden).filter(Orden.alumno_id == alumno_id)
    q_insignias = db.query(InsigniaAlumno).filter(InsigniaAlumno.alumno_id == alumno_id)
    if grupo_id:
        q_ordenes = q_ordenes.filter(Orden.grupo_id == grupo_id)
        q_insignias = q_insignias.filter(InsigniaAlumno.grupo_id == grupo_id)

    n_ordenes = q_ordenes.count()
    insignias = q_insignias.all()

    xp_ordenes = n_ordenes * XP_POR_ORDEN
    xp_insignias = 0
    por_rareza: dict[str, int] = {"bronce": 0, "plata": 0, "oro": 0, "diamante": 0}
    for ins in insignias:
        nivel_badge = BADGES.get(ins.codigo, {}).get("nivel", "facil")
        xp_insignias += XP_POR_RAREZA.get(nivel_badge, 0)
        rareza = RAREZA_NOMBRE.get(nivel_badge)
        if rareza:
            por_rareza[rareza] += 1

    xp_total = xp_ordenes + xp_insignias
    progreso = calcular_nivel(xp_total)
    progreso.update({
        "xp_ordenes": xp_ordenes,
        "xp_insignias": xp_insignias,
        "n_ordenes": n_ordenes,
        "n_insignias": len(insignias),
        "insignias_por_rareza": por_rareza,
    })
    return progreso
