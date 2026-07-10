# Smoke Tests — Tradex

Prueba automática que simula un maestro, un alumno y verifica seguridad básica.

## Ejecutar contra producción

```bash
pip install httpx
python tests/smoke_test.py https://tradex-production-f3b4.up.railway.app
```

## Ejecutar contra local

```bash
# Primero levanta el backend:
cd backend && uvicorn main:app --reload

# En otra terminal:
python tests/smoke_test.py http://localhost:8000
```

## Qué prueba

**Conectividad:** health check, precios de acciones, cripto, forex, BMV  
**Maestro:** registro, login, crear grupo  
**Alumno:** registro con código de grupo, portafolio, comprar/vender, orden límite, alerta de precio, ranking  
**Seguridad:** rutas sin token → 401, contraseña incorrecta → 401, grupo inexistente → 404

## Notas

- Crea cuentas temporales únicas (`bot_*@test.tradex`) en cada ejecución
- El bot maestro se registra como alumno por defecto — para probar creación de grupos necesita ser promovido a maestro desde el panel admin
- Sale con código 0 si todo pasa, 1 si hay fallos
