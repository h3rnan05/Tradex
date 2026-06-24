from collections import defaultdict
import csv
import io
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from activos_utils import validar_activos_permitidos
from auth_utils import get_current_user, require_maestro
from database import get_db
from models.fase_activo import FaseActivo
from models.grupo import Grupo, _generar_codigo
from models.holding import Holding
from models.insignia import InsigniaAlumno
from models.comentario import ComentarioOrden
from models.orden import Orden
from models.orden_pendiente import OrdenPendiente
from models.membership import Membership
from models.user import RolEnum, User
from precios_utils import obtener_precio_actual
from schemas.grupo import EvaluacionEntry, GrupoCreate, GrupoDetalle, GrupoOut, GrupoUpdate, InvitarRequest
from schemas.membership import MembershipOut
from schemas.ranking import RankingEntry

router = APIRouter(prefix="/grupos", tags=["grupos"])


@router.post("", response_model=GrupoOut, status_code=status.HTTP_201_CREATED)
def crear_grupo(payload: GrupoCreate, db: Session = Depends(get_db), maestro: User = Depends(require_maestro)):
    validar_activos_permitidos(payload.activos_permitidos)
    # Generate a unique 6-char code, retry on collision
    for _ in range(10):
        codigo = _generar_codigo()
        if not db.query(Grupo).filter(Grupo.codigo == codigo).first():
            break

    grupo = Grupo(
        nombre=payload.nombre,
        maestro_id=maestro.id,
        fecha_inicio=payload.fecha_inicio,
        fecha_fin=payload.fecha_fin,
        capital_inicial=payload.capital_inicial,
        max_alumnos=payload.max_alumnos,
        activos_permitidos=payload.activos_permitidos,
        limite_orden_valor=payload.limite_orden_valor,
        comision_porcentaje=payload.comision_porcentaje,
        max_apalancamiento=payload.max_apalancamiento,
        comision_base=payload.comision_base,
        derivados_nivel=payload.derivados_nivel,
        codigo=codigo,
    )
    db.add(grupo)
    db.flush()

    for fase in payload.fases_activo:
        db.add(FaseActivo(grupo_id=grupo.id, tipo_activo=fase.tipo_activo, fecha_activacion=fase.fecha_activacion))

    db.commit()
    db.refresh(grupo)
    return grupo


@router.get("", response_model=list[GrupoOut])
def listar_grupos(db: Session = Depends(get_db), maestro: User = Depends(require_maestro)):
    return db.query(Grupo).filter(Grupo.maestro_id == maestro.id).all()


class UnirseRequest(BaseModel):
    codigo: str


@router.post("/unirse", response_model=MembershipOut, status_code=status.HTTP_201_CREATED)
def unirse_por_codigo(
    payload: UnirseRequest,
    db: Session = Depends(get_db),
    alumno: User = Depends(get_current_user),
):
    if alumno.rol != RolEnum.alumno:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo los alumnos pueden unirse por código")

    grupo = db.query(Grupo).filter(Grupo.codigo == payload.codigo.upper().strip()).first()
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Código de grupo inválido")

    existente = db.query(Membership).filter(
        Membership.grupo_id == grupo.id, Membership.alumno_id == alumno.id
    ).first()
    if existente:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya perteneces a este grupo")

    if grupo.max_alumnos is not None:
        total_actual = db.query(Membership).filter(Membership.grupo_id == grupo.id).count()
        if total_actual >= grupo.max_alumnos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El grupo ya alcanzó el límite de {grupo.max_alumnos} alumnos",
            )

    membership = Membership(
        grupo_id=grupo.id,
        alumno_id=alumno.id,
        capital_disponible=grupo.capital_inicial,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


@router.get("/{grupo_id}", response_model=GrupoDetalle)
def detalle_grupo(grupo_id: str, db: Session = Depends(get_db), maestro: User = Depends(require_maestro)):
    grupo = (
        db.query(Grupo)
        .options(joinedload(Grupo.memberships), joinedload(Grupo.fases_activo))
        .filter(Grupo.id == grupo_id, Grupo.maestro_id == maestro.id)
        .first()
    )
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")

    from models.holding import Holding
    from models.orden import Orden

    holdings = db.query(Holding).filter(Holding.grupo_id == grupo.id).all()
    ordenes = (
        db.query(Orden)
        .filter(Orden.grupo_id == grupo.id)
        .order_by(Orden.timestamp.desc())
        .limit(50)
        .all()
    )

    detalle = GrupoDetalle.model_validate(grupo)
    detalle.holdings = holdings
    detalle.ordenes = ordenes
    return detalle


@router.post("/{grupo_id}/invitar", response_model=MembershipOut, status_code=status.HTTP_201_CREATED)
def invitar_alumno(
    grupo_id: str,
    payload: InvitarRequest,
    db: Session = Depends(get_db),
    maestro: User = Depends(require_maestro),
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id, Grupo.maestro_id == maestro.id).first()
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")

    alumno = db.query(User).filter(User.email == payload.alumno_email, User.rol == RolEnum.alumno).first()
    if not alumno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alumno no encontrado")

    existente = db.query(Membership).filter(
        Membership.grupo_id == grupo.id, Membership.alumno_id == alumno.id
    ).first()
    if existente:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El alumno ya pertenece al grupo")

    if grupo.max_alumnos is not None:
        total_actual = db.query(Membership).filter(Membership.grupo_id == grupo.id).count()
        if total_actual >= grupo.max_alumnos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El grupo ya alcanzo el limite de {grupo.max_alumnos} alumnos",
            )

    membership = Membership(
        grupo_id=grupo.id,
        alumno_id=alumno.id,
        capital_disponible=grupo.capital_inicial,
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


@router.patch("/{grupo_id}", response_model=GrupoOut)
def actualizar_grupo(
    grupo_id: str,
    payload: GrupoUpdate,
    db: Session = Depends(get_db),
    maestro: User = Depends(require_maestro),
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id, Grupo.maestro_id == maestro.id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    if payload.activos_permitidos is not None:
        validar_activos_permitidos(payload.activos_permitidos)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(grupo, field, value)
    db.commit()
    db.refresh(grupo)
    return grupo


@router.post("/{grupo_id}/memberships/{membership_id}/pausar", response_model=MembershipOut)
def pausar_participante(
    grupo_id: str,
    membership_id: str,
    db: Session = Depends(get_db),
    maestro: User = Depends(require_maestro),
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id, Grupo.maestro_id == maestro.id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    membership = db.query(Membership).filter(Membership.id == membership_id, Membership.grupo_id == grupo_id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Participante no encontrado")
    membership.pausado = not membership.pausado
    db.commit()
    db.refresh(membership)
    return membership


@router.delete("/{grupo_id}/memberships/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_participante(
    grupo_id: str,
    membership_id: str,
    db: Session = Depends(get_db),
    maestro: User = Depends(require_maestro),
):
    """Elimina a un alumno del grupo junto con todos sus datos en ese grupo
    (órdenes, posiciones, órdenes pendientes, comentarios e insignias)."""
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id, Grupo.maestro_id == maestro.id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    membership = db.query(Membership).filter(Membership.id == membership_id, Membership.grupo_id == grupo_id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Participante no encontrado")

    alumno_id = membership.alumno_id
    # Borrar datos dependientes del alumno dentro de este grupo.
    # Los comentarios cuelgan de las órdenes del alumno, así que se borran primero.
    orden_ids = [
        o.id for o in db.query(Orden.id).filter(
            Orden.grupo_id == grupo_id, Orden.alumno_id == alumno_id
        ).all()
    ]
    if orden_ids:
        db.query(ComentarioOrden).filter(
            ComentarioOrden.orden_id.in_(orden_ids)
        ).delete(synchronize_session=False)
    db.query(OrdenPendiente).filter(
        OrdenPendiente.grupo_id == grupo_id, OrdenPendiente.alumno_id == alumno_id
    ).delete(synchronize_session=False)
    db.query(Orden).filter(
        Orden.grupo_id == grupo_id, Orden.alumno_id == alumno_id
    ).delete(synchronize_session=False)
    db.query(Holding).filter(
        Holding.grupo_id == grupo_id, Holding.alumno_id == alumno_id
    ).delete(synchronize_session=False)
    db.query(InsigniaAlumno).filter(
        InsigniaAlumno.grupo_id == grupo_id, InsigniaAlumno.alumno_id == alumno_id
    ).delete(synchronize_session=False)
    db.delete(membership)
    db.commit()


@router.get("/{grupo_id}/evaluacion", response_model=list[EvaluacionEntry])
def evaluacion_grupo(
    grupo_id: str,
    db: Session = Depends(get_db),
    maestro: User = Depends(require_maestro),
):
    from datetime import datetime, timezone
    from models.orden import Orden
    from schemas.grupo import EvaluacionEntry

    grupo = db.query(Grupo).filter(Grupo.id == grupo_id, Grupo.maestro_id == maestro.id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")

    memberships = (
        db.query(Membership).options(joinedload(Membership.alumno)).filter(Membership.grupo_id == grupo_id).all()
    )

    alumno_ids = [m.alumno_id for m in memberships]

    # Batch fetch holdings to avoid N+1
    all_holdings = db.query(Holding).filter(
        Holding.grupo_id == grupo_id, Holding.alumno_id.in_(alumno_ids)
    ).all()
    holdings_map: dict = defaultdict(list)
    for h in all_holdings:
        holdings_map[str(h.alumno_id)].append(h)

    # Batch fetch orders (comisiones + count)
    all_ordenes = db.query(Orden).filter(
        Orden.grupo_id == grupo_id, Orden.alumno_id.in_(alumno_ids)
    ).all()
    ordenes_map: dict = defaultdict(list)
    for o in all_ordenes:
        ordenes_map[str(o.alumno_id)].append(o)

    precios_cache: dict[str, Decimal] = {}
    entradas = []
    hoy = datetime.now(timezone.utc)

    for m in memberships:
        holdings = holdings_map[str(m.alumno_id)]
        ordenes = ordenes_map[str(m.alumno_id)]

        valor_holdings = Decimal("0")
        for h in holdings:
            if h.cantidad == 0:
                continue
            if h.ticker not in precios_cache:
                try:
                    precios_cache[h.ticker] = obtener_precio_actual(h.ticker)
                except Exception:
                    precios_cache[h.ticker] = h.precio_promedio
            valor_holdings += precios_cache[h.ticker] * h.cantidad

        valor_total = m.capital_disponible + valor_holdings
        rendimiento = valor_total - grupo.capital_inicial
        rendimiento_porcentaje = (rendimiento / grupo.capital_inicial * 100) if grupo.capital_inicial else Decimal("0")
        comisiones_pagadas = sum(Decimal(str(o.comision)) for o in ordenes)
        tickers = list({h.ticker for h in holdings if h.cantidad > 0})
        dias_activo = (hoy - m.created_at).days if m.created_at else 0

        entradas.append(
            EvaluacionEntry(
                alumno_id=m.alumno_id,
                nombre=m.alumno.nombre,
                escuela=getattr(m.alumno, "escuela", None),
                ciudad=getattr(m.alumno, "ciudad", None),
                estado=getattr(m.alumno, "estado", None),
                posicion=0,
                valor_total=valor_total,
                capital_inicial=grupo.capital_inicial,
                rendimiento=rendimiento,
                rendimiento_porcentaje=rendimiento_porcentaje,
                comisiones_pagadas=comisiones_pagadas,
                num_operaciones=len(ordenes),
                tickers=tickers,
                dias_activo=dias_activo,
                pausado=m.pausado,
            )
        )

    entradas.sort(key=lambda e: e.valor_total, reverse=True)
    for i, e in enumerate(entradas):
        e.posicion = i + 1
    return entradas


@router.get("/{grupo_id}/evaluacion/exportar")
def exportar_evaluacion_csv(
    grupo_id: str,
    db: Session = Depends(get_db),
    maestro: User = Depends(require_maestro),
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id, Grupo.maestro_id == maestro.id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")

    # Reuse the evaluacion logic
    entradas = evaluacion_grupo(grupo_id, db, maestro)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Posición", "Nombre", "Escuela", "Ciudad", "Estado",
        "Valor Total (USD)", "Capital Inicial (USD)", "Rendimiento (USD)",
        "Rendimiento (%)", "Comisiones Pagadas (USD)", "# Operaciones",
        "Activos en Cartera", "Días Activo", "Pausado"
    ])
    for e in entradas:
        writer.writerow([
            e.posicion,
            e.nombre,
            e.escuela or "",
            e.ciudad or "",
            e.estado or "",
            f"{e.valor_total:.2f}",
            f"{e.capital_inicial:.2f}",
            f"{e.rendimiento:.2f}",
            f"{e.rendimiento_porcentaje:.2f}",
            f"{e.comisiones_pagadas:.2f}",
            e.num_operaciones,
            ", ".join(e.tickers),
            e.dias_activo,
            "Sí" if e.pausado else "No",
        ])

    output.seek(0)
    nombre_archivo = f"tradex_{grupo.nombre.replace(' ', '_')}_ranking.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )


@router.get("/{grupo_id}/ranking", response_model=list[RankingEntry])
def ranking_grupo(grupo_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")

    es_maestro_del_grupo = current_user.rol == RolEnum.maestro and grupo.maestro_id == current_user.id
    membresia_propia = db.query(Membership).filter(
        Membership.grupo_id == grupo_id, Membership.alumno_id == current_user.id
    ).first()
    if not es_maestro_del_grupo and not membresia_propia:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    memberships = (
        db.query(Membership)
        .options(joinedload(Membership.alumno))
        .filter(Membership.grupo_id == grupo_id)
        .all()
    )

    precios_cache: dict[str, Decimal] = {}
    entradas = []
    for membership in memberships:
        holdings = db.query(Holding).filter(
            Holding.alumno_id == membership.alumno_id, Holding.grupo_id == grupo_id
        ).all()

        valor_holdings = Decimal("0")
        for h in holdings:
            if h.cantidad == 0:
                continue
            if h.ticker not in precios_cache:
                precios_cache[h.ticker] = obtener_precio_actual(h.ticker)
            valor_holdings += precios_cache[h.ticker] * h.cantidad

        valor_total = membership.capital_disponible + valor_holdings
        rendimiento = valor_total - grupo.capital_inicial
        rendimiento_porcentaje = (
            (rendimiento / grupo.capital_inicial * 100) if grupo.capital_inicial else Decimal("0")
        )

        entradas.append(
            RankingEntry(
                alumno_id=membership.alumno_id,
                nombre=membership.alumno.nombre,
                valor_total=valor_total,
                rendimiento=rendimiento,
                rendimiento_porcentaje=rendimiento_porcentaje,
            )
        )

    entradas.sort(key=lambda e: e.valor_total, reverse=True)
    return entradas


@router.post("/{grupo_id}/regenerar-codigo", response_model=GrupoOut)
def regenerar_codigo(
    grupo_id: str,
    db: Session = Depends(get_db),
    maestro: User = Depends(require_maestro),
):
    grupo = db.query(Grupo).filter(Grupo.id == grupo_id, Grupo.maestro_id == maestro.id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    for _ in range(10):
        codigo = _generar_codigo()
        if not db.query(Grupo).filter(Grupo.codigo == codigo).first():
            break
    grupo.codigo = codigo
    db.commit()
    db.refresh(grupo)
    return grupo
