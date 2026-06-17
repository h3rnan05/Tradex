import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
from limiter import limiter
from routers import admin, alumnos, auth, comentarios, comparador, grupos, insignias, ordenes, ordenes_limite, portafolios_modelo, precios, retos, sponsor


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warn (do not crash) on a weak JWT secret so a misconfigured env var can
    # never take the whole service down. Harden by setting a strong JWT_SECRET.
    if settings.jwt_secret in ("", "change-me") or len(settings.jwt_secret) < 32:
        logging.getLogger("tradex").warning(
            "JWT_SECRET is weak or unset. Set a strong random value (>=32 chars): "
            'python -c "import secrets; print(secrets.token_hex(32))"'
        )
    yield


app = FastAPI(title="Tradex API", description="Simulador educativo de inversion", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    # Allow any Vercel deployment (production + preview URLs) without having to
    # update an env var every time the deploy hash changes.
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(grupos.router)
app.include_router(ordenes.router)
app.include_router(ordenes_limite.router)
app.include_router(precios.router)
app.include_router(alumnos.router)
app.include_router(portafolios_modelo.router)
app.include_router(retos.router)
app.include_router(insignias.router)
app.include_router(comentarios.router)
app.include_router(sponsor.router)
app.include_router(comparador.router)


@app.get("/")
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "tradex-api"}
