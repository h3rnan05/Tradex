"""Load test de Tradex con Locust: simula una clase de alumnos entrando casi al mismo tiempo.

Cada usuario simulado (alumno_test_1 .. alumno_test_N):
  1. Hace login en POST /auth/login (con reintentos si el rate limit responde 429).
  2. Consulta sus holdings en GET /alumnos/{id}/portafolio (de ahí obtiene su grupo_id).
  3. Consulta el precio de un ticker en GET /precios/{ticker}.
  4. Crea una orden de compra en POST /ordenes/compra.
  5. Repite las consultas cada 5-15 segundos (con compras ocasionales).

Los usuarios de prueba deben existir antes de correr: python seed_test_users.py
Configuración de la corrida (host, usuarios, ramp-up, duración): ver locust.conf
"""

import itertools
import os
import random
import time

from locust import HttpUser, between, task
from locust import stats as locust_stats
from locust.exception import StopUser

# Percentiles que se reportan en consola, CSV y HTML (incluye p50/p95/p99 pedidos)
locust_stats.PERCENTILES_TO_REPORT = [0.50, 0.75, 0.90, 0.95, 0.99, 1.0]
locust_stats.PERCENTILES_TO_CHART = [0.50, 0.95, 0.99]

NUM_TEST_USERS = int(os.getenv("NUM_TEST_USERS", "40"))
EMAIL_DOMAIN = os.getenv("LOADTEST_EMAIL_DOMAIN", "loadtest.tradex.mx")
PASSWORD = os.getenv("LOADTEST_PASSWORD", "LoadTest2026!")

# El login está limitado a 10/minuto por IP (slowapi). Desde una sola máquina de
# carga los 40 logins del ramp-up van a recibir 429; se reintenta con backoff.
LOGIN_MAX_ATTEMPTS = int(os.getenv("LOGIN_MAX_ATTEMPTS", "12"))
LOGIN_BACKOFF_MIN = float(os.getenv("LOGIN_BACKOFF_MIN", "15"))
LOGIN_BACKOFF_MAX = float(os.getenv("LOGIN_BACKOFF_MAX", "35"))

# Pool de tickers (mismos que /precios/destacados) para repartir las consultas
TICKERS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "NFLX"]

# Cantidad de acciones por orden de compra
ORDER_CANTIDAD = os.getenv("ORDER_CANTIDAD", "1")

_user_counter = itertools.count(0)


class AlumnoClase(HttpUser):
    """Un alumno de la clase: entra, revisa su portafolio, checa precios y compra."""

    wait_time = between(5, 15)

    def on_start(self):
        # Asigna una cuenta de prueba distinta a cada usuario simulado
        n = next(_user_counter) % NUM_TEST_USERS + 1
        self.email = f"alumno_test_{n}@{EMAIL_DOMAIN}"
        self.user_id = None
        self.grupo_id = None

        self._login()

        # Primera pasada del flujo completo: holdings -> precio -> orden de compra
        self.consultar_holdings()
        self.consultar_precio()
        self.crear_orden_compra()

    def _login(self):
        for intento in range(1, LOGIN_MAX_ATTEMPTS + 1):
            with self.client.post(
                "/auth/login",
                json={"email": self.email, "password": PASSWORD},
                name="/auth/login",
                catch_response=True,
            ) as resp:
                if resp.status_code == 200:
                    data = resp.json()
                    self.user_id = data["user_id"]
                    self.client.headers["Authorization"] = f"Bearer {data['access_token']}"
                    resp.success()
                    return
                if resp.status_code == 429:
                    resp.failure("429: rate limit de login (10/min por IP)")
                else:
                    resp.failure(f"{resp.status_code}: {resp.text[:200]}")

            if intento < LOGIN_MAX_ATTEMPTS:
                time.sleep(random.uniform(LOGIN_BACKOFF_MIN, LOGIN_BACKOFF_MAX))

        # Sin token no tiene sentido seguir generando 401s
        raise StopUser()

    @task(4)
    def consultar_holdings(self):
        with self.client.get(
            f"/alumnos/{self.user_id}/portafolio",
            name="/alumnos/[id]/portafolio",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                # El portafolio trae el grupo_id que necesitamos para las órdenes
                self.grupo_id = resp.json().get("grupo_id")
                resp.success()
            else:
                resp.failure(f"{resp.status_code}: {resp.text[:200]}")

    @task(4)
    def consultar_precio(self):
        ticker = random.choice(TICKERS)
        self.client.get(f"/precios/{ticker}", name="/precios/[ticker]")

    @task(1)
    def crear_orden_compra(self):
        if not self.grupo_id:
            return
        with self.client.post(
            "/ordenes/compra",
            json={"grupo_id": self.grupo_id, "ticker": random.choice(TICKERS), "cantidad": ORDER_CANTIDAD},
            name="/ordenes/compra",
            catch_response=True,
        ) as resp:
            if resp.status_code == 201:
                resp.success()
            else:
                resp.failure(f"{resp.status_code}: {resp.text[:200]}")
