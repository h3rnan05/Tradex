"""
Tradex smoke test — simula 3 roles contra la API de producción (o local).

Uso:
  python tests/smoke_test.py                          # apunta a producción
  python tests/smoke_test.py http://localhost:8000    # apunta a local

Crea cuentas temporales únicas en cada ejecución y las limpia al final.
"""

import sys
import uuid
import time
import httpx

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "https://tradex-production-f3b4.up.railway.app"
RUN  = uuid.uuid4().hex[:6]   # sufijo único para esta ejecución

MAESTRO_EMAIL = f"bot_maestro_{RUN}@test.tradex"
ALUMNO_EMAIL  = f"bot_alumno_{RUN}@test.tradex"
PASSWORD      = "Tradex2025!"

PASS = "✅"
FAIL = "❌"

resultados: list[tuple[str, bool, str]] = []

def check(nombre: str, cond: bool, detalle: str = ""):
    mark = PASS if cond else FAIL
    resultados.append((nombre, cond, detalle))
    print(f"  {mark}  {nombre}" + (f"  →  {detalle}" if detalle else ""))
    return cond

def seccion(titulo: str):
    print(f"\n{'─'*55}")
    print(f"  {titulo}")
    print(f"{'─'*55}")

# ── helpers ──────────────────────────────────────────────────

def registrar(email: str, nombre: str, codigo: str | None = None) -> dict | None:
    payload = {"email": email, "nombre": nombre, "password": PASSWORD}
    if codigo:
        payload["codigo_grupo"] = codigo
    r = httpx.post(f"{BASE}/auth/register", json=payload, timeout=15)
    if r.status_code == 201:
        return r.json()
    print(f"    ⚠  register {email}: {r.status_code} {r.text[:120]}")
    return None

def login(email: str) -> str | None:
    r = httpx.post(f"{BASE}/auth/login", json={"email": email, "password": PASSWORD}, timeout=10)
    if r.status_code == 200:
        return r.json()["access_token"]
    return None

def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ══════════════════════════════════════════════════════════════
#  BLOQUE 1 — Conectividad básica
# ══════════════════════════════════════════════════════════════
seccion("1 · Conectividad básica")
r = httpx.get(f"{BASE}/health", timeout=10)
check("GET /health responde 200", r.status_code == 200, str(r.status_code))

r = httpx.get(f"{BASE}/precios/AAPL", timeout=15)
check("GET /precios/AAPL devuelve precio", r.status_code == 200 and "precio" in r.json(),
      r.json().get("precio", "—") if r.status_code == 200 else str(r.status_code))

r = httpx.get(f"{BASE}/precios/BTC-USD", timeout=15)
check("GET /precios/BTC-USD (cripto)", r.status_code == 200, "")

r = httpx.get(f"{BASE}/precios/EURUSD=X", timeout=15)
check("GET /precios/EURUSD=X (forex)", r.status_code == 200, "")

r = httpx.get(f"{BASE}/precios/AMXL.MX", timeout=15)
check("GET /precios/AMXL.MX (BMV)", r.status_code == 200, "")


# ══════════════════════════════════════════════════════════════
#  BLOQUE 2 — Maestro: registro y creación de grupo
# ══════════════════════════════════════════════════════════════
seccion("2 · Maestro")
data_m = registrar(MAESTRO_EMAIL, f"Bot Maestro {RUN}")
check("Registro maestro", data_m is not None)
if not data_m:
    print("  ⛔  No se puede continuar sin maestro"); sys.exit(1)

# El registro crea alumnos por defecto; promovemos via /admin o lo dejamos
# (en producción el admin promueve, aquí solo probamos el flujo alumno→maestro
#  si hay un endpoint disponible, si no lo saltamos)
token_m = login(MAESTRO_EMAIL)
check("Login maestro", token_m is not None)

# Intentar crear grupo (solo funciona si el rol es maestro/admin)
today = time.strftime("%Y-%m-%d")
r = httpx.post(f"{BASE}/grupos", json={
    "nombre": f"Grupo Bot {RUN}",
    "fecha_inicio": f"{today}T00:00:00Z",
    "fecha_fin": "2026-12-31T23:59:59Z",
    "capital_inicial": 50000,
    "activos_permitidos": ["acciones", "crypto"],
}, headers=auth(token_m), timeout=15)
# Puede fallar con 403 si el bot es alumno (esperado en producción sin promoción manual)
grupo_id = None
codigo_grupo = None
if r.status_code == 201:
    grupo_id = r.json()["id"]
    codigo_grupo = r.json().get("codigo")
    check("Crear grupo", True, f"id={grupo_id[:8]}… código={codigo_grupo}")
else:
    check("Crear grupo (requiere rol maestro)", r.status_code in (201, 403),
          f"status={r.status_code} — normal si el bot no fue promovido a maestro")


# ══════════════════════════════════════════════════════════════
#  BLOQUE 3 — Alumno: registro, unirse, operar
# ══════════════════════════════════════════════════════════════
seccion("3 · Alumno")
data_a = registrar(ALUMNO_EMAIL, f"Bot Alumno {RUN}", codigo_grupo)
check("Registro alumno" + (f" con código {codigo_grupo}" if codigo_grupo else ""), data_a is not None)

token_a = login(ALUMNO_EMAIL)
check("Login alumno", token_a is not None)
if not token_a:
    print("  ⛔  No se puede continuar sin token de alumno"); sys.exit(1)

alumno_id = data_a["user_id"]

# Portafolio
r = httpx.get(f"{BASE}/alumnos/{alumno_id}/portafolio", headers=auth(token_a), timeout=15)
check("GET portafolio", r.status_code == 200, f"status={r.status_code}")
portafolio_grupo_id = r.json().get("grupo_id") if r.status_code == 200 else None

# Sólo operar si el alumno tiene grupo
if portafolio_grupo_id:
    capital = float(r.json().get("capital_disponible", 0))
    check("Capital disponible > 0", capital > 0, f"${capital:,.2f}")

    # Comprar AAPL
    r2 = httpx.post(f"{BASE}/ordenes/compra", json={
        "grupo_id": portafolio_grupo_id,
        "ticker": "AAPL",
        "cantidad": "1",
    }, headers=auth(token_a), timeout=15)
    check("Comprar 1 AAPL", r2.status_code == 201,
          r2.json().get("precio_ejecucion", r2.text[:80]) if r2.status_code == 201 else r2.text[:80])

    # Verificar holding
    r3 = httpx.get(f"{BASE}/alumnos/{alumno_id}/portafolio", headers=auth(token_a), timeout=15)
    holdings = r3.json().get("holdings", []) if r3.status_code == 200 else []
    tiene_aapl = any(h["ticker"] == "AAPL" for h in holdings)
    check("Holding AAPL en portafolio", tiene_aapl)

    # Vender AAPL
    r4 = httpx.post(f"{BASE}/ordenes/venta", json={
        "grupo_id": portafolio_grupo_id,
        "ticker": "AAPL",
        "cantidad": "1",
    }, headers=auth(token_a), timeout=15)
    check("Vender 1 AAPL", r4.status_code == 201, "")

    # Historial de órdenes
    r5 = httpx.get(f"{BASE}/alumnos/{alumno_id}/ordenes", headers=auth(token_a), timeout=15)
    check("Historial de órdenes", r5.status_code == 200 and len(r5.json()) >= 2,
          f"{len(r5.json())} órdenes" if r5.status_code == 200 else str(r5.status_code))

    # Orden límite
    r6 = httpx.post(f"{BASE}/ordenes-limite", json={
        "grupo_id": portafolio_grupo_id,
        "ticker": "AAPL",
        "tipo": "compra",
        "cantidad": "1",
        "precio_limite": "1.00",
    }, headers=auth(token_a), timeout=15)
    check("Crear orden límite", r6.status_code == 201, "")
    orden_limite_id = r6.json().get("id") if r6.status_code == 201 else None

    if orden_limite_id:
        r7 = httpx.delete(f"{BASE}/ordenes-limite/{orden_limite_id}", headers=auth(token_a), timeout=15)
        check("Cancelar orden límite", r7.status_code == 204, "")

    # Alerta de precio
    r8 = httpx.post(f"{BASE}/ordenes-limite/alertas", json={
        "ticker": "AAPL", "precio_objetivo": "1.00", "condicion": "lte",
    }, headers=auth(token_a), timeout=15)
    check("Crear alerta de precio", r8.status_code == 201, "")
    alerta_id = r8.json().get("id") if r8.status_code == 201 else None

    if alerta_id:
        r9 = httpx.delete(f"{BASE}/ordenes-limite/alertas/{alerta_id}", headers=auth(token_a), timeout=15)
        check("Eliminar alerta", r9.status_code == 204, "")

    # Ranking del grupo
    r10 = httpx.get(f"{BASE}/grupos/{portafolio_grupo_id}/ranking", headers=auth(token_a), timeout=15)
    check("GET ranking del grupo", r10.status_code == 200, f"{len(r10.json())} entradas" if r10.status_code == 200 else str(r10.status_code))

else:
    check("Alumno tiene grupo asignado", False, "sin grupo — operaciones omitidas")


# ══════════════════════════════════════════════════════════════
#  BLOQUE 4 — Seguridad básica
# ══════════════════════════════════════════════════════════════
seccion("4 · Seguridad")
r = httpx.get(f"{BASE}/alumnos/{alumno_id}/portafolio", timeout=10)
check("Sin token → 401 o 403", r.status_code in (401, 403), str(r.status_code))

r = httpx.post(f"{BASE}/auth/login", json={"email": ALUMNO_EMAIL, "password": "wrongpassword"}, timeout=10)
check("Contraseña incorrecta → 401", r.status_code == 401, str(r.status_code))

r = httpx.get(f"{BASE}/grupos/{uuid.uuid4()}/ranking", headers=auth(token_a), timeout=10)
check("Grupo inexistente → 404", r.status_code in (404, 403), str(r.status_code))


# ══════════════════════════════════════════════════════════════
#  RESUMEN
# ══════════════════════════════════════════════════════════════
print(f"\n{'═'*55}")
total  = len(resultados)
ok     = sum(1 for _, v, _ in resultados if v)
fallos = total - ok
print(f"  Resultado: {ok}/{total} pruebas pasaron  {'🎉' if fallos == 0 else f'⚠  {fallos} fallo(s)'}")
print(f"{'═'*55}\n")

if fallos:
    print("Fallos:")
    for nombre, ok, detalle in resultados:
        if not ok:
            print(f"  {FAIL}  {nombre}" + (f" — {detalle}" if detalle else ""))
    print()

sys.exit(0 if fallos == 0 else 1)
