"""Crea (de forma idempotente) los datos de prueba que necesita el load test:

- 1 maestro de prueba (maestro_test@<dominio>)
- 1 grupo "Grupo Load Test" con capital amplio y todos los activos permitidos
- N alumnos alumno_test_1 .. alumno_test_N (default 40) con membership en el grupo

Se conecta directo a la base de datos usando la configuración del backend
(DATABASE_URL de backend/.env o de la variable de entorno), porque el endpoint
/auth/register tiene rate limit de 5/min y tardaría ~8 minutos en crear 40 cuentas.

Uso (desde backend/, con el venv del backend activado):
    python loadtest/seed_test_users.py

En cada corrida, el capital disponible de los alumnos se resetea al capital
inicial del grupo para que las corridas repetidas partan del mismo estado.
"""

import os
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from auth_utils import hash_password  # noqa: E402
from database import SessionLocal, database_url  # noqa: E402
from models.grupo import Grupo  # noqa: E402
from models.membership import Membership  # noqa: E402
from models.user import RolEnum, User  # noqa: E402

NUM_TEST_USERS = int(os.getenv("NUM_TEST_USERS", "40"))
EMAIL_DOMAIN = os.getenv("LOADTEST_EMAIL_DOMAIN", "loadtest.tradex.mx")
PASSWORD = os.getenv("LOADTEST_PASSWORD", "LoadTest2026!")
MAESTRO_EMAIL = f"maestro_test@{EMAIL_DOMAIN}"
GRUPO_NOMBRE = "Grupo Load Test"
CAPITAL_INICIAL = Decimal(os.getenv("LOADTEST_CAPITAL", "1000000"))


def main() -> None:
    host = database_url.split("@")[-1] if "@" in database_url else database_url
    print(f"Base de datos: {host}")
    print(f"Creando/verificando {NUM_TEST_USERS} alumnos de prueba...\n")

    # bcrypt es lento (~0.3s por hash); un solo hash compartido basta para cuentas de prueba
    hashed = hash_password(PASSWORD)

    db = SessionLocal()
    try:
        maestro = db.query(User).filter(User.email == MAESTRO_EMAIL).first()
        if not maestro:
            maestro = User(email=MAESTRO_EMAIL, nombre="Maestro Load Test", hashed_password=hashed, rol=RolEnum.maestro)
            db.add(maestro)
            db.flush()
            print(f"[+] Maestro creado: {MAESTRO_EMAIL}")
        else:
            print(f"[=] Maestro ya existe: {MAESTRO_EMAIL}")

        grupo = db.query(Grupo).filter(Grupo.nombre == GRUPO_NOMBRE, Grupo.maestro_id == maestro.id).first()
        if not grupo:
            ahora = datetime.now(timezone.utc)
            grupo = Grupo(
                nombre=GRUPO_NOMBRE,
                maestro_id=maestro.id,
                fecha_inicio=ahora,
                fecha_fin=ahora + timedelta(days=365),
                capital_inicial=CAPITAL_INICIAL,
                max_alumnos=None,
                activos_permitidos=["acciones", "indices", "commodities"],
                limite_orden_valor=None,
                comision_porcentaje=Decimal("0"),
            )
            db.add(grupo)
            db.flush()
            print(f"[+] Grupo creado: {GRUPO_NOMBRE} (capital inicial ${CAPITAL_INICIAL})")
        else:
            print(f"[=] Grupo ya existe: {GRUPO_NOMBRE}")

        creados = existentes = 0
        for i in range(1, NUM_TEST_USERS + 1):
            email = f"alumno_test_{i}@{EMAIL_DOMAIN}"
            alumno = db.query(User).filter(User.email == email).first()
            if not alumno:
                alumno = User(email=email, nombre=f"alumno_test_{i}", hashed_password=hashed, rol=RolEnum.alumno)
                db.add(alumno)
                db.flush()
                creados += 1
            else:
                alumno.suspendido = False
                existentes += 1

            membership = db.query(Membership).filter(
                Membership.grupo_id == grupo.id, Membership.alumno_id == alumno.id
            ).first()
            if not membership:
                db.add(Membership(grupo_id=grupo.id, alumno_id=alumno.id, capital_disponible=grupo.capital_inicial))
            else:
                # Resetea el capital para que cada corrida parta del mismo estado
                membership.capital_disponible = grupo.capital_inicial
                membership.pausado = False

        db.commit()
        print(f"\n[OK] Alumnos creados: {creados}, ya existentes: {existentes}")
        print(f"[OK] Credenciales: alumno_test_1@{EMAIL_DOMAIN} .. alumno_test_{NUM_TEST_USERS}@{EMAIL_DOMAIN}")
        print(f"[OK] Password: {PASSWORD}")
        print(f"[OK] grupo_id: {grupo.id}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
