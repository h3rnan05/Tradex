from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import alumnos, auth, grupos, ordenes, ordenes_limite, portafolios_modelo, precios, retos

app = FastAPI(title="Tradex API", description="Simulador educativo de inversion")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(grupos.router)
app.include_router(ordenes.router)
app.include_router(ordenes_limite.router)
app.include_router(precios.router)
app.include_router(alumnos.router)
app.include_router(portafolios_modelo.router)
app.include_router(retos.router)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "tradex-api"}
