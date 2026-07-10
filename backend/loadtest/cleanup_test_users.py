"""Borra de la base de datos TODOS los datos generados por el load test:

- Los alumnos alumno_test_* y el maestro maestro_test@<dominio>
- El grupo de prueba del maestro (y sus fases de activo)
- Sus órdenes, órdenes pendientes, holdings, memberships, alertas,
  insignias, comentarios y datos de retos

Uso (desde backend/, con el venv del backend activado):
    python loadtest/cleanup_test_users.py            # pide confirmación
    python loadtest/cleanup_test_users.py --dry-run  # solo muestra qué borraría
    python loadtest/cleanup_test_users.py --yes      # borra sin preguntar

Apunta a la base que indique DATABASE_URL (backend/.env o variable de entorno).
El script imprime el host de la base antes de tocar nada.
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import or_  # noqa: E402

from database import SessionLocal, database_url  # noqa: E402
from models.alerta import Alerta  # noqa: E402
from models.comentario import ComentarioOrden  # noqa: E402
from models.fase_activo import FaseActivo  # noqa: E402
from models.grupo import Grupo  # noqa: E402
from models.holding import Holding  # noqa: E402
from models.insignia import InsigniaAlumno  # noqa: E402
from models.membership import Membership  # noqa: E402
from models.orden import Orden  # noqa: E402
from models.orden_pendiente import OrdenPendiente  # noqa: E402
from models.reto import Reto, RetoHolding, RetoOrden, RetoParticipante  # noqa: E402
from models.user import User  # noqa: E402

EMAIL_DOMAIN = os.getenv("LOADTEST_EMAIL_DOMAIN", "loadtest.tradex.mx")
ALUMNO_PATTERN = f"alumno_test_%@{EMAIL_DOMAIN}"
MAESTRO_EMAIL = f"maestro_test@{EMAIL_DOMAIN}"


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    skip_confirm = "--yes" in sys.argv

    host = database_url.split("@")[-1] if "@" in database_url else database_url
    print(f"Base de datos: {host}")

    db = SessionLocal()
    try:
        alumnos = db.query(User).filter(User.email.like(ALUMNO_PATTERN)).all()
        maestro = db.query(User).filter(User.email == MAESTRO_EMAIL).first()

        user_ids = [u.id for u in alumnos] + ([maestro.id] if maestro else [])
        if not user_ids:
            print("No se encontraron usuarios de prueba. Nada que borrar.")
            return

        grupo_ids = []
        if maestro:
            grupo_ids = [gid for (gid,) in db.query(Grupo.id).filter(Grupo.maestro_id == maestro.id).all()]

        print(f"Usuarios de prueba encontrados: {len(alumnos)} alumnos"
              f"{' + 1 maestro' if maestro else ''}")
        print(f"Grupos de prueba encontrados: {len(grupo_ids)}")

        if dry_run:
            n_ordenes = db.query(Orden).filter(Orden.alumno_id.in_(user_ids)).count()
            n_holdings = db.query(Holding).filter(Holding.alumno_id.in_(user_ids)).count()
            n_memberships = db.query(Membership).filter(Membership.alumno_id.in_(user_ids)).count()
            print(f"\n[dry-run] Se borrarían: {n_ordenes} órdenes, {n_holdings} holdings, "
                  f"{n_memberships} memberships y {len(user_ids)} usuarios.")
            return

        if not skip_confirm:
            respuesta = input("\n¿Borrar todos estos datos? Escribe 'si' para confirmar: ").strip().lower()
            if respuesta not in ("si", "sí", "s", "yes", "y"):
                print("Cancelado.")
                return

        def borrar(query, etiqueta: str) -> None:
            n = query.delete(synchronize_session=False)
            print(f"  - {etiqueta}: {n}")

        print("\nBorrando...")

        # Hijos primero, respetando las foreign keys
        cond_ordenes = [Orden.alumno_id.in_(user_ids)]
        if grupo_ids:
            cond_ordenes.append(Orden.grupo_id.in_(grupo_ids))
        ordenes_ids = [oid for (oid,) in db.query(Orden.id).filter(or_(*cond_ordenes)).all()]
        if ordenes_ids:
            borrar(db.query(ComentarioOrden).filter(ComentarioOrden.orden_id.in_(ordenes_ids)), "comentarios de órdenes")
        if grupo_ids:
            borrar(db.query(ComentarioOrden).filter(ComentarioOrden.grupo_id.in_(grupo_ids)), "comentarios del grupo")

        reto_ids = []
        if grupo_ids:
            reto_ids = [r for r, in db.query(Reto.id).filter(Reto.grupo_id.in_(grupo_ids)).all()]
        cond_reto = [RetoOrden.alumno_id.in_(user_ids)]
        if reto_ids:
            cond_reto.append(RetoOrden.reto_id.in_(reto_ids))
        borrar(db.query(RetoOrden).filter(or_(*cond_reto)), "órdenes de retos")
        cond_reto = [RetoHolding.alumno_id.in_(user_ids)]
        if reto_ids:
            cond_reto.append(RetoHolding.reto_id.in_(reto_ids))
        borrar(db.query(RetoHolding).filter(or_(*cond_reto)), "holdings de retos")
        cond_reto = [RetoParticipante.alumno_id.in_(user_ids)]
        if reto_ids:
            cond_reto.append(RetoParticipante.reto_id.in_(reto_ids))
        borrar(db.query(RetoParticipante).filter(or_(*cond_reto)), "participantes de retos")
        if reto_ids:
            borrar(db.query(Reto).filter(Reto.id.in_(reto_ids)), "retos")

        borrar(db.query(OrdenPendiente).filter(OrdenPendiente.alumno_id.in_(user_ids)), "órdenes pendientes")
        borrar(db.query(Alerta).filter(Alerta.alumno_id.in_(user_ids)), "alertas")
        borrar(db.query(InsigniaAlumno).filter(InsigniaAlumno.alumno_id.in_(user_ids)), "insignias")
        borrar(db.query(Orden).filter(Orden.alumno_id.in_(user_ids)), "órdenes")
        borrar(db.query(Holding).filter(Holding.alumno_id.in_(user_ids)), "holdings")
        borrar(db.query(Membership).filter(Membership.alumno_id.in_(user_ids)), "memberships")

        if grupo_ids:
            # Datos de otros alumnos que hubieran quedado colgando del grupo de prueba
            borrar(db.query(OrdenPendiente).filter(OrdenPendiente.grupo_id.in_(grupo_ids)), "órdenes pendientes del grupo")
            borrar(db.query(InsigniaAlumno).filter(InsigniaAlumno.grupo_id.in_(grupo_ids)), "insignias del grupo")
            borrar(db.query(Orden).filter(Orden.grupo_id.in_(grupo_ids)), "órdenes del grupo")
            borrar(db.query(Holding).filter(Holding.grupo_id.in_(grupo_ids)), "holdings del grupo")
            borrar(db.query(Membership).filter(Membership.grupo_id.in_(grupo_ids)), "memberships del grupo")
            borrar(db.query(FaseActivo).filter(FaseActivo.grupo_id.in_(grupo_ids)), "fases de activo")
            borrar(db.query(Grupo).filter(Grupo.id.in_(grupo_ids)), "grupos")

        borrar(db.query(User).filter(User.id.in_(user_ids)), "usuarios")

        db.commit()
        print("\n[OK] Limpieza completada.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
