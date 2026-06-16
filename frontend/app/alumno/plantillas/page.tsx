"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Badge, Card, formatoMoneda } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";

interface ActivoPlantilla {
  ticker: string;
  porcentaje: string;
}

interface Plantilla {
  perfil_riesgo: string;
  nombre: string;
  descripcion: string;
  activos: ActivoPlantilla[];
}

interface OrdenAplicada {
  id: string;
  ticker: string;
  cantidad: string;
  precio_ejecucion: string;
  comision: string;
}

interface AplicarRespuesta {
  ordenes: OrdenAplicada[];
  advertencias: string[];
}

const TONOS: Record<string, "ganancia" | "neutral" | "perdida"> = {
  conservador: "ganancia",
  moderado: "neutral",
  agresivo: "perdida",
};

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState<Plantilla[] | null>(null);
  const [aplicando, setAplicando] = useState<string | null>(null);
  const [resultado, setResultado] = useState<AplicarRespuesta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Plantilla[]>("/portafolios-modelo")
      .then(setPlantillas)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error al cargar las plantillas"));
  }, []);

  async function aplicarPlantilla(perfil: string) {
    setError(null);
    setResultado(null);
    setAplicando(perfil);
    try {
      const data = await api.post<AplicarRespuesta>("/portafolios-modelo/aplicar", { perfil_riesgo: perfil });
      setResultado(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo aplicar la plantilla");
    } finally {
      setAplicando(null);
    }
  }

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="mb-2 text-2xl font-bold text-ink">Portafolios por perfil de riesgo</h1>
        <p className="mb-6 text-sm text-ink/40">
          Elige una plantilla y se distribuirá tu capital disponible entre los activos sugeridos según los
          porcentajes definidos.
        </p>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {!plantillas ? (
          <p className="text-ink/40">Cargando...</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {plantillas.map((p) => (
              <Card key={p.perfil_riesgo} className="flex flex-col">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-mono text-sm font-bold uppercase tracking-wide text-ink">{p.nombre}</h2>
                  <Badge tone={TONOS[p.perfil_riesgo] ?? "neutral"}>{p.perfil_riesgo}</Badge>
                </div>
                <p className="mb-4 text-xs text-ink/40">{p.descripcion}</p>
                <ul className="mb-4 flex flex-col gap-1">
                  {p.activos.map((a) => (
                    <li key={a.ticker} className="flex justify-between text-sm">
                      <span className="font-medium text-ink">{a.ticker}</span>
                      <span className="text-ink/50">{(Number(a.porcentaje) * 100).toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => aplicarPlantilla(p.perfil_riesgo)}
                  disabled={aplicando !== null}
                  className="mt-auto rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/80 disabled:opacity-50"
                >
                  {aplicando === p.perfil_riesgo ? "Aplicando..." : "Aplicar plantilla"}
                </button>
              </Card>
            ))}
          </div>
        )}

        {resultado && (
          <Card className="mt-6">
            <h2 className="mb-3 text-lg font-semibold text-ink">Resultado</h2>
            {resultado.ordenes.length > 0 && (
              <ul className="mb-3 flex flex-col gap-1 text-sm">
                {resultado.ordenes.map((o) => (
                  <li key={o.id}>
                    Compraste {o.cantidad} {o.ticker} a {formatoMoneda(o.precio_ejecucion)} (comisión:{" "}
                    {formatoMoneda(o.comision)})
                  </li>
                ))}
              </ul>
            )}
            {resultado.advertencias.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm text-perdida">
                {resultado.advertencias.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </main>
  );
}
