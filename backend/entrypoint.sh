#!/bin/sh
# Do NOT use `set -e`. If the DB is briefly unreachable while migrations run,
# we still want the web service to boot and serve traffic (the schema already
# exists in Supabase). A failed migration logs a warning instead of killing
# the whole deploy.

echo "Running database migrations..."
if alembic upgrade head; then
  echo "Migrations applied."
else
  echo "WARNING: 'alembic upgrade head' failed. Starting server anyway (schema may already be up to date)."
fi

exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
