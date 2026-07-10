# Load test de Tradex (Locust)

Simula una clase de **40 alumnos** que entran casi al mismo tiempo. Cada usuario
simulado hace login, consulta sus holdings, consulta el precio de un ticker,
crea una orden de compra, y luego repite las consultas cada 5-15 segundos
(con compras ocasionales).

## Archivos

| Archivo | Qué hace |
|---|---|
| `locustfile.py` | El escenario de carga |
| `locust.conf` | Config de la corrida local (host, 40 usuarios, ramp-up 60 s, 5 min) |
| `seed_test_users.py` | Crea maestro + grupo + 40 alumnos de prueba (idempotente) |
| `cleanup_test_users.py` | Borra los usuarios de prueba y todos sus datos |

## 1. Corrida local (localhost:8000)

```bash
cd backend
source .venv/bin/activate
pip install -r loadtest/requirements.txt

# Levanta el backend en otra terminal:
#   uvicorn main:app --port 8000

# Crea los 40 alumnos de prueba (directo en la BD; idempotente)
python loadtest/seed_test_users.py

# Corre el load test (lee locust.conf: 40 usuarios, ramp-up 60 s, 5 min)
cd loadtest
locust
```

Al terminar obtienes:

- **Consola**: tabla final con requests/segundo (RPS), percentiles **p50/p95/p99**
  y **# fails / tasa de errores** por endpoint y agregado.
- **`loadtest_report.html`**: reporte con gráficas de RPS, latencias y errores.
- **`loadtest_stats.csv`** / **`loadtest_failures.csv`**: datos crudos por endpoint.

### Qué esperar (comportamientos conocidos del backend)

- **429 en `/auth/login`**: el login tiene rate limit de **10/min por IP**
  (slowapi, `routers/auth.py`). Los 40 logins salen de la IP de tu máquina de
  carga, así que ~30 van a recibir 429 durante el ramp-up; el locustfile
  reintenta con backoff hasta que todos entran (~4 min). Esos 429 cuentan como
  errores en el reporte — y son un hallazgo real: un salón entero detrás del
  NAT de la escuela también comparte una sola IP pública.
- **429/503 en `/precios/*` y `/ordenes/compra`**: cada consulta de precio y
  cada orden le pega en vivo a Yahoo Finance sin caché de precios en el
  backend. Con 40 usuarios consultando cada 5-15 s, Yahoo puede empezar a
  limitar; el backend lo traduce a 429.

## 2. Corrida contra producción (Render)

> ⚠️ Corre esto **fuera de horario de clase**: es tráfico real contra la base
> de producción (Supabase) y contra Yahoo Finance. Avisa a quien corresponda.

```bash
cd backend
source .venv/bin/activate

# 1. Sembrar los usuarios de prueba EN LA BASE DE PRODUCCIÓN
#    (usa la connection string de Supabase que tiene el servicio en Render)
DATABASE_URL="postgresql://usuario:password@host:5432/postgres" \
  python loadtest/seed_test_users.py

# 2. Correr Locust apuntando al servicio de Render (sobreescribe el host del .conf)
cd loadtest
locust --host https://tradex-backend.onrender.com
```

Ajusta `tradex-backend` al nombre real de tu servicio en Render. Notas:

- **Cold start**: si el servicio está en plan free, Render lo duerme; haz un
  `curl https://<servicio>.onrender.com/` y espera a que responda antes de
  correr el test, o el primer minuto medirá el arranque y no el backend.
- El rate limit de login aplica igual (todo Locust sale de una IP), y en Render
  los tiempos incluyen la latencia de red hasta su datacenter.
- Puedes bajar la carga para una primera prueba: `locust --host https://... -u 10 -r 0.5 -t 2m`.

## 3. Limpieza

Borra los 40 alumnos, el maestro, el grupo de prueba y todo lo que generaron
(órdenes, holdings, memberships, alertas, insignias, comentarios, retos):

```bash
cd backend

# Local
python loadtest/cleanup_test_users.py --dry-run   # muestra qué borraría
python loadtest/cleanup_test_users.py             # pide confirmación

# Producción (misma DATABASE_URL que usaste para sembrar)
DATABASE_URL="postgresql://usuario:password@host:5432/postgres" \
  python loadtest/cleanup_test_users.py
```

El script imprime el host de la base de datos antes de tocar nada y pide
confirmación (usa `--yes` para saltarla, p. ej. en CI).

## Variables de entorno opcionales

| Variable | Default | Para qué |
|---|---|---|
| `NUM_TEST_USERS` | `40` | Número de alumnos de prueba (seed y locustfile) |
| `LOADTEST_PASSWORD` | `LoadTest2026!` | Password de las cuentas de prueba |
| `LOADTEST_EMAIL_DOMAIN` | `loadtest.tradex.mx` | Dominio de los emails de prueba |
| `LOADTEST_CAPITAL` | `1000000` | Capital inicial del grupo de prueba |
| `ORDER_CANTIDAD` | `1` | Acciones por orden de compra |
| `LOGIN_MAX_ATTEMPTS` | `12` | Reintentos de login ante 429 |
