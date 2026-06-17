from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session


from activos_utils import activo_desbloqueado, clasificar_ticker
from models.fase_activo import FaseActivo
from auth_utils import require_alumno
from database import get_db
from models.grupo import Grupo
from models.holding import Holding
from models.membership import Membership
from models.orden import Orden, TipoOrdenEnum
from models.user import User
from precios_utils import obtener_precio_actual
from schemas.orden import OrdenCreate, OrdenOut

router = APIRouter(prefix="/ordenes", tags=["ordenes"])


def _get_membership(db: Session, alumno: User, grupo_id) -> Membership:
    membership = db.query(Membership).filter(
        Membership.alumno_id == alumno.id, Membership.grupo_id == grupo_id
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No perteneces a ese grupo")
    return membership


def ejecutar_compra(db: Session, alumno: User, membership: Membership, grupo: Grupo, ticker: str, cantidad: Decimal) -> Orden:
    if cantidad <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La cantidad debe ser mayor a cero")

    ticker = ticker.upper().strip()

    tipo_activo = clasificar_ticker(ticker)
    fases_activo = db.query(FaseActivo).filter(FaseActivo.grupo_id == grupo.id).all()
    if not activo_desbloqueado(tipo_activo, grupo.activos_permitidos, fases_activo):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tu grupo no permite operar activos de tipo '{tipo_activo}' todavia",
        )

    precio = obtener_precio_actual(ticker)
    costo_total = precio * cantidad
    comision = costo_total * grupo.comision_porcentaje

    if grupo.limite_orden_valor is not None and costo_total > grupo.limite_orden_valor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El monto de la orden supera el limite permitido de ${grupo.limite_orden_valor}",
        )

    if costo_total + comision > membership.capital_disponible:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Capital disponible insuficiente")

    holding = db.query(Holding).filter(
        Holding.alumno_id == alumno.id, Holding.grupo_id == membership.grupo_id, Holding.ticker == ticker
    ).first()

    if holding:
        cantidad_total = holding.cantidad + cantidad
        costo_previo = holding.precio_promedio * holding.cantidad
        holding.precio_promedio = (costo_previo + costo_total) / cantidad_total
        holding.cantidad = cantidad_total
    else:
        holding = Holding(
            alumno_id=alumno.id,
            grupo_id=membership.grupo_id,
            ticker=ticker,
            cantidad=cantidad,
            precio_promedio=precio,
        )
        db.add(holding)

    membership.capital_disponible -= costo_total + comision

    orden = Orden(
        alumno_id=alumno.id,
        grupo_id=membership.grupo_id,
        ticker=ticker,
        tipo=TipoOrdenEnum.compra,
        cantidad=cantidad,
        precio_ejecucion=precio,
        comision=comision,
    )
    db.add(orden)
    return orden


@router.post("/compra", response_model=OrdenOut, status_code=status.HTTP_201_CREATED)
def comprar(payload: OrdenCreate, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    membership = _get_membership(db, alumno, payload.grupo_id)
    if membership.pausado:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tu participación está pausada")
    grupo = db.query(Grupo).filter(Grupo.id == payload.grupo_id).first()

    orden = ejecutar_compra(db, alumno, membership, grupo, payload.ticker, payload.cantidad)
    db.commit()
    db.refresh(orden)
    return orden


@router.post("/venta", response_model=OrdenOut, status_code=status.HTTP_201_CREATED)
def vender(payload: OrdenCreate, db: Session = Depends(get_db), alumno: User = Depends(require_alumno)):
    if payload.cantidad <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La cantidad debe ser mayor a cero")

    membership = _get_membership(db, alumno, payload.grupo_id)
    if membership.pausado:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tu participación está pausada")
    grupo = db.query(Grupo).filter(Grupo.id == payload.grupo_id).first()
    ticker = payload.ticker.upper().strip()

    holding = db.query(Holding).filter(
        Holding.alumno_id == alumno.id, Holding.grupo_id == payload.grupo_id, Holding.ticker == ticker
    ).first()

    if not holding or holding.cantidad < payload.cantidad:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No tienes suficientes acciones para vender")

    precio = obtener_precio_actual(ticker)
    monto_total = precio * payload.cantidad
    comision = monto_total * grupo.comision_porcentaje

    holding.cantidad -= payload.cantidad
    if holding.cantidad == 0:
        holding.precio_promedio = Decimal("0")

    membership.capital_disponible += monto_total - comision

    orden = Orden(
        alumno_id=alumno.id,
        grupo_id=payload.grupo_id,
        ticker=ticker,
        tipo=TipoOrdenEnum.venta,
        cantidad=payload.cantidad,
        precio_ejecucion=precio,
        comision=comision,
    )
    db.add(orden)
    db.commit()
    db.refresh(orden)
    try:
        evaluar_y_otorgar_insignias(db, alumno.id, payload.grupo_id)
    except Exception:
        pass
    return orden
