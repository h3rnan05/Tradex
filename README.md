# Tradex

Simulador educativo de inversión con dos roles: **maestro** y **alumno**. Los maestros
crean grupos con capital virtual y los alumnos compran/venden activos reales (precios
vía Yahoo Finance) para practicar inversión sin riesgo.

## Stack

- **Frontend:** Next.js 15 (App Router, TypeScript, Tailwind CSS)
- **Backend:** FastAPI + SQLAlchemy + Alembic
- **Base de datos:** PostgreSQL (Supabase)
- **Precios de mercado:** yfinance (Yahoo Finance)

## Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # completar DATABASE_URL, SUPABASE_URL, SUPABASE_KEY, JWT_SECRET
alembic upgrade head
uvicorn main:app --reload
```

En producción, `entrypoint.sh` corre `alembic upgrade head` antes de levantar `uvicorn`.

## Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local  # completar variables de Supabase y NEXT_PUBLIC_API_URL
npm run dev
```

## Deploy

- **Frontend:** Vercel
- **Backend:** Render (ver `render.yaml`)
