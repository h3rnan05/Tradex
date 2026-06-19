#!/usr/bin/env python
"""Smoke test contra la API de Tradex (local o Railway).

Uso:
    python tests/smoke_test.py https://tradex-production-f3b4.up.railway.app
    python tests/smoke_test.py http://localhost:8000
"""

import sys
import uuid
import random
import string
import httpx

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8000"

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"
NOTE = "\033[33mNOTE\033[0m"

results: list[bool] = []


def check(label: str, ok: bool, detail: str = "") -> None:
    tag = PASS if ok else FAIL
    print(f"  [{tag}] {label}" + (f"  → {detail}" if detail else ""))
    results.append(ok)


def note(label: str, detail: str = "") -> None:
    print(f"  [{NOTE}] {label}" + (f"  → {detail}" if detail else ""))


tag = "".join(random.choices(string.ascii_lowercase, k=8))
EMAIL = f"tradex.smoke.{tag}@gmail.com"
PASSWORD = "SmokeTest1!"

print(f"\nSmoke test → {BASE}\n")

with httpx.Client(base_url=BASE, timeout=30) as c:

    # ── Health ────────────────────────────────────────────────────────────────
    r = c.get("/")
    data = r.json() if r.status_code == 200 else {}
    check("GET / → 200", r.status_code == 200, str(r.status_code))
    check("service = tradex-api", data.get("service") == "tradex-api", str(data))

    # ── Docs ──────────────────────────────────────────────────────────────────
    check("GET /docs → 200", c.get("/docs").status_code == 200)
    check("GET /openapi.json → 200", c.get("/openapi.json").status_code == 200)

    # ── Registro ──────────────────────────────────────────────────────────────
    print("\n── Auth ──")
    r = c.post("/auth/register", json={"email": EMAIL, "nombre": f"Smoke {tag}", "password": PASSWORD})
    check("POST /auth/register → 201", r.status_code == 201, str(r.status_code))
    if r.status_code != 201:
        print("  BODY:", r.text[:200])
        print("\nFATAL: sin token, no se puede continuar")
        sys.exit(1)

    d = r.json()
    token = d["access_token"]
    alumno_id = d["user_id"]
    check("rol = alumno", d["rol"] == "alumno", d["rol"])
    auth = {"Authorization": f"Bearer {token}"}

    # ── auth/me ───────────────────────────────────────────────────────────────
    r = c.get("/auth/me", headers=auth)
    check("GET /auth/me → 200", r.status_code == 200)
    r = c.patch("/auth/me", json={"escuela": "Test U"}, headers=auth)
    check("PATCH /auth/me → 200", r.status_code == 200)

    # ── Forgot password ───────────────────────────────────────────────────────
    r = c.post("/auth/forgot-password", json={"email": EMAIL})
    check("POST /auth/forgot-password → 204", r.status_code == 204)
    r = c.post("/auth/forgot-password", json={"email": "noexiste@example.com"})
    check("forgot-password email inexistente → 204 (anti-enum)", r.status_code == 204)
    r = c.post("/auth/reset-password", json={"token": "invalido", "new_password": "NuevaPass1!"})
    check("reset-password token inválido → 400", r.status_code == 400)

    # ── Login ─────────────────────────────────────────────────────────────────
    r = c.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})
    check("POST /auth/login → 200", r.status_code == 200)
    r = c.post("/auth/login", json={"email": EMAIL, "password": "wrongpass"})
    check("login contraseña incorrecta → 401", r.status_code == 401)

    # ── Alumno: grupos y portafolio ───────────────────────────────────────────
    print("\n── Alumno ──")
    r = c.get(f"/alumnos/{alumno_id}/grupos", headers=auth)
    check("GET /alumnos/{id}/grupos → 200", r.status_code == 200)
    if r.status_code == 200:
        check("lista vacía (sin grupo)", r.json() == [])

    r = c.get(f"/alumnos/{alumno_id}/portafolio", headers=auth)
    check("GET /alumnos/{id}/portafolio sin grupo → 404", r.status_code == 404)

    r = c.get(f"/alumnos/{alumno_id}/ordenes", headers=auth)
    check("GET /alumnos/{id}/ordenes → 200", r.status_code == 200)

    r = c.post("/grupos/unirse", json={"codigo": "INVALIDO"}, headers=auth)
    check("POST /grupos/unirse código inválido → 404", r.status_code == 404)

    # ── Insignias ─────────────────────────────────────────────────────────────
    r = c.get("/insignias/mis-insignias", headers=auth)
    check("GET /insignias/mis-insignias → 200", r.status_code == 200)

    # ── Órdenes límite ────────────────────────────────────────────────────────
    r = c.get("/ordenes-limite", headers=auth)
    check("GET /ordenes-limite → 200", r.status_code == 200)
    r = c.get("/ordenes-limite/notificaciones", headers=auth)
    check("GET /ordenes-limite/notificaciones → 200", r.status_code == 200)
    r = c.get("/ordenes-limite/alertas", headers=auth)
    check("GET /ordenes-limite/alertas → 200", r.status_code == 200)

    # ── Portafolios modelo ────────────────────────────────────────────────────
    r = c.get("/portafolios-modelo", headers=auth)
    check("GET /portafolios-modelo → 200", r.status_code == 200)
    if r.status_code == 200:
        note("Plantillas", str([p["perfil_riesgo"] for p in r.json()]))

    # ── Precios / mercados ────────────────────────────────────────────────────
    print("\n── Precios ──")
    for path in [
        "/precios/destacados", "/precios/indices", "/precios/sectores",
        "/precios/screener", "/precios/noticias-generales", "/precios/earnings-calendar",
        "/precios/escenarios", "/precios/explorador/acciones",
    ]:
        r = c.get(path, headers=auth)
        check(f"GET {path} → 200", r.status_code == 200, str(r.status_code))

    r = c.get("/precios/AAPL", headers=auth)
    check("GET /precios/AAPL → 200", r.status_code == 200)
    if r.status_code == 200:
        precio = r.json().get("precio", 0)
        check("precio AAPL > 0", float(precio) > 0, str(precio))

    r = c.get("/precios/AAPL/historial?dias=5", headers=auth)
    check("GET /precios/AAPL/historial → 200", r.status_code == 200)
    if r.status_code == 200:
        check("historial no vacío", len(r.json().get("historial", [])) > 0)

    r = c.get("/precios/AAPL/ficha", headers=auth)
    check("GET /precios/AAPL/ficha → 200", r.status_code == 200)
    r = c.get("/precios/AAPL/noticias", headers=auth)
    check("GET /precios/AAPL/noticias → 200", r.status_code == 200)

    # ── Acceso denegado (cross-rol) ───────────────────────────────────────────
    print("\n── Control de acceso ──")
    r = c.get("/grupos", headers=auth)
    check("GET /grupos como alumno → 403", r.status_code == 403)
    r = c.post("/grupos", json={
        "nombre": "X", "fecha_inicio": "2025-01-01T00:00:00Z",
        "fecha_fin": "2025-12-31T00:00:00Z", "capital_inicial": 10000,
        "activos_permitidos": ["acciones"], "fases_activo": [],
    }, headers=auth)
    check("POST /grupos como alumno → 403", r.status_code == 403)
    r = c.get("/admin/stats", headers=auth)
    check("GET /admin/stats como alumno → 403", r.status_code == 403)
    r = c.post(f"/admin/users/{uuid.uuid4()}/cambiar-rol", json={"rol": "admin"}, headers=auth)
    check("POST /admin/cambiar-rol como alumno → 403", r.status_code == 403)
    r = c.get("/sponsor/mis-grupos", headers=auth)
    check("GET /sponsor/mis-grupos como alumno → 403", r.status_code == 403)

    # ── Operaciones sin grupo → 404 ───────────────────────────────────────────
    fake_grupo = str(uuid.uuid4())
    for path in ["/ordenes/compra", "/ordenes/venta", "/ordenes/short", "/ordenes/cubrir"]:
        r = c.post(path, json={"grupo_id": fake_grupo, "ticker": "AAPL", "cantidad": "1"}, headers=auth)
        check(f"POST {path} sin membership → 404", r.status_code == 404)

    # ── Sin token → 401 ───────────────────────────────────────────────────────
    print("\n── Sin token ──")
    for path in ["/auth/me", "/grupos", "/admin/stats", "/precios/destacados", "/portafolios-modelo"]:
        r = c.get(path)
        check(f"GET {path} sin token → 401", r.status_code == 401)


passed = sum(results)
total = len(results)
print(f"\n{'─' * 50}")
print(f"  {passed}/{total} checks passed")
if passed < total:
    print(f"  {total - passed} FALLARON")
    sys.exit(1)
else:
    print("  Todo OK.")
