from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth_utils import get_current_user
from database import get_db
from models.holding import Holding
from models.membership import Membership
from models.user import RolEnum, User
from precios_utils import obtener_precio_actual
from schemas.holding import HoldingConPrecio, PortafolioOut

router = APIRouter(prefix="/alumnos", tags=["alumnos"])


@router.get("/{alumno_id}/portafolio", response_model=PortafolioOut)
def portafolio(alumno_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if str(current_user.id) != alumno_id and current_user.rol != RolEnum.maestro:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    membership = db.query(Membership).filter(Membership.alumno_id == alumno_id).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El alumno no pertenece a ningun grupo")

    holdings = db.query(Holding).filter(
        Holding.alumno_id == alumno_id, Holding.grupo_id == membership.grupo_id
    ).all()

    holdings_con_precio = []
    valor_holdings = Decimal("0")
    for h in holdings:
        if h.cantidad == 0:
            continue
        precio_actual = obtener_precio_actual(h.ticker)
        valor_mercado = precio_actual * h.cantidad
        costo = h.precio_promedio * h.cantidad
        pnl = valor_mercado - costo
        pnl_porcentaje = (pnl / costo * 100) if costo else Decimal("0")
        valor_holdings += valor_mercado
        holdings_con_precio.append(
            HoldingConPrecio(
                id=h.id,
                alumno_id=h.alumno_id,
                grupo_id=h.grupo_id,
                ticker=h.ticker,
                cantidad=h.cantidad,
                precio_promedio=h.precio_promedio,
                precio_actual=precio_actual,
                valor_mercado=valor_mercado,
                pnl=pnl,
                pnl_porcentaje=pnl_porcentaje,
            )
        )

    capital_inicial = membership.grupo.capital_inicial
    valor_total = membership.capital_disponible + valor_holdings
    rendimiento = valor_total - capital_inicial
    rendimiento_porcentaje = (rendimiento / capital_inicial * 100) if capital_inicial else Decimal("0")

    return PortafolioOut(
        grupo_id=membership.grupo_id,
        capital_disponible=membership.capital_disponible,
        capital_inicial=capital_inicial,
        holdings=holdings_con_precio,
        valor_total=valor_total,
        rendimiento=rendimiento,
        rendimiento_porcentaje=rendimiento_porcentaje,
    )
