# Setup del Day Trading Bot (Paper, $1,000) — Guía para Hernán

Este documento cubre lo que NO puede hacer Claude solo: credenciales,
reset de la cuenta paper y configuración de las 6 cloud routines.

Lo único estrictamente requerido para arrancar: cuenta GitHub (ya la
tienes), API keys de Alpaca **paper**, y Claude Code con cloud routines.
Perplexity y ClickUp son opcionales — los scripts ya tienen fallback.

---

## Paso 1 — Cuenta Alpaca paper y reset a $1,000

1. Crea cuenta en https://alpaca.markets (no necesitas fondear nada; solo
   usaremos paper).
2. En el dashboard, cambia al modo **Paper Trading** (toggle arriba a la
   izquierda).
3. **Resetea la cuenta paper a $1,000**: en Paper Trading hay un menú
   (⚙️ / "Reset") que permite regenerar la cuenta con el equity que elijas.
   Pon exactamente **1000**. Este es el baseline del Day 0 en
   `memory/TRADE-LOG.md`.
4. Genera las **API keys de paper** (sección "API Keys" dentro del modo
   paper — OJO: las keys de paper y live son distintas).

## Paso 2 — Smoke test local

```bash
cp .env.example .env       # y pega ALPACA_KEY_ID y ALPACA_SECRET_KEY
bash scripts/alpaca.sh account   # debe devolver equity=1000, cash=1000
```

Luego, dentro de Claude Code en este repo: `/portfolio`.
Debe reportar equity $1,000, sin posiciones, daytrade_count 0.

Verifica también la regla dura paper-only:

```bash
ALPACA_ENDPOINT=https://api.alpaca.markets/v2 bash scripts/alpaca.sh account
# Debe imprimir "FATAL: ... Refusing to run against a live endpoint" y salir con código 2
```

## Paso 3 — Las 6 cloud routines

En https://claude.ai/code → este repo → **Routines**. Antes de crear las
rutinas, activa en la configuración del repo el toggle
**"Allow unrestricted branch pushes"** (las rutinas necesitan poder
commitear los logs).

Crea 6 rutinas, todas con timezone **America/Chicago** (Bahía de Banderas
va casi igual que Chicago; el pre-market de las 5:00 AM Chicago te queda
~4-5 AM local según la época del año). En cada una:

- **Prompt:** pega el contenido del archivo indicado de `prompts/`.
- **Variables de entorno:** `ALPACA_KEY_ID`, `ALPACA_SECRET_KEY`,
  `ALPACA_ENDPOINT=https://paper-api.alpaca.markets/v2`
  (y opcionalmente `PERPLEXITY_API_KEY`, `CLICKUP_API_TOKEN`,
  `CLICKUP_LIST_ID`).

| Rutina | Cron | Prompt |
|---|---|---|
| pre-market | `0 5 * * 1-5` | `prompts/pre-market.md` |
| market-open | `45 8 * * 1-5` | `prompts/market-open.md` |
| midday | `0 12 * * 1-5` | `prompts/midday.md` |
| **market-close** | `45 14 * * 1-5` | `prompts/market-close.md` — la más importante |
| daily-summary | `30 15 * * 1-5` | `prompts/daily-summary.md` |
| weekly-review | `0 16 * * 5` | `prompts/weekly-review.md` |

## Paso 4 — "Run now" de prueba (una por una, en este orden)

1. **pre-market** — debe escribir un plan en `memory/RESEARCH-LOG.md`,
   reportar daytrade_count y commitear. (Fuera de horario de mercado el
   plan igual se genera; es solo prueba.)
2. **market-open** — con mercado cerrado debe detectarlo vía `clock` y
   salir limpio. Eso es un PASS.
3. **midday** — sin posiciones debe loguear "flat" y commitear.
4. **market-close** — debe verificar que no hay nada abierto y confirmar
   100% cash.
5. **daily-summary** — debe escribir el snapshot en
   `memory/DAILY-SUMMARY.md` y commitear (commit obligatorio).
6. **weekly-review** — genera un review vacío/parcial; sirve para validar
   el formato.

Si cada "Run now" termina con un commit pusheado al repo, el sistema está
vivo. A partir de ahí corre solo de lunes a viernes.

## Notas

- **ClickUp:** no hace falta cuenta. Sin token, `scripts/clickup.sh`
  escribe a `memory/DAILY-SUMMARY.md`, que al estar commiteado se lee desde
  GitHub. Mejora futura: reemplazarlo por un `telegram.sh` con el Bot API
  de Telegram (gratis) — pídemelo cuando quieras.
- **Perplexity:** empieza sin key; el script hace fallback al WebSearch
  nativo de Claude. Agrégala después si el research necesita citas.
- **Dinero real:** NO es parte de este proyecto. Se evalúa solo tras
  mínimo 4 semanas de weekly reviews con resultados consistentes.
