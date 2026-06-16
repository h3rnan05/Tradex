from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth_utils import require_alumno
from database import get_db
from models.grupo import Grupo
from models.membership import Membership
from models.user import User
from portafolios_modelo import PERFILES_RIESGO_VALIDOS, PLANTILLAS_PORTAFOLIO
from precios_utils import obtener_precio_actual
from routers.ordenes import ejecutar_compra
from schemas.portafolio_modelo import (
    ActivoPlantilla,
    AplicarPlantillaRequest,
    AplicarPlantillaResponse,
    PlantillaPortafolioOut,
)

router = APIRouter(prefix="/portafolios-modelo", tags=["portafolios-modelo"])


@router.get("", response_model=list[PlantillaPortafolioOut])
def listar_plantillas():
    return [
        PlantillaPortafolioOut(
            perfil_riesgo=perfil,
            nombre=plantilla["nombre"],
            descripcion=plantilla["descripcion"],
            activos=[ActivoPlantilla(**activo) for activo in plantilla["activos"]],
        )
        for perfil, plantilla in PLANTILLAS_PORTAFOLIO.items()
    ]


@router.post("/aplicar", response_model=AplicarPlantillaResponse, status_code=status.HTTP_201_CREATED)
def aplicar_plantilla(
    payload: AplicarPlantillaRequest,
    db: Session = Depends(get_db),
    alumno: User = Depends(require_alumno),
):
    if payload.perfil_riesgo not in PERFILES_RIESGO_VALIDOS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Perfil de riesgo invalido")

    membership = db.query(Membership).filter(Membership.alumno_id == alumno.id).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No perteneces a ningun grupo")

    grupo = db.query(Grupo).filter(Grupo.id == membership.grupo_id).first()
    capital_a_invertir = membership.capital_disponible

    ordenes = []
    advertencias = []

    for activo in PLANTILLAS_PORTAFOLIO[payload.perfil_riesgo]["activos"]:
        ticker = activo["ticker"]
        porcentaje = Decimal(activo["porcentaje"])
        monto = capital_a_invertir * porcentaje
        try:
            precio = obtener_precio_actual(ticker)
            cantidad = (monto / precio).quantize(Decimal("0.0001"))
            if cantidad <= 0:
                advertencias.append(f"{ticker}: monto insuficiente para comprar al menos una fraccion")
                continue
            orden = ejecutar_compra(db, alumno, membership, grupo, ticker, cantidad)
            ordenes.append(orden)
        except HTTPException as exc:
            advertencias.append(f"{ticker}: {exc.detail}")

    db.commit()
    for orden in ordenes:
        db.refresh(orden)

    return AplicarPlantillaResponse(ordenes=ordenes, advertencias=advertencias)
