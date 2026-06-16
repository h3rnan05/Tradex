"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import PrecioChart from "@/components/PrecioChart";
import { Badge, Card, formatoPorcentaje } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";

interface Escenario {
  id: string;
  nombre: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  tickers_sugeridos: string[];
}

interface HistorialEscenario {
  ticker: string;
  escenario_id: string;
  historial: { fecha: string; precio: string }[];
  rendimiento_porcentaje: number;
}

export default function EscenariosPage() {
  const [escenarios, setEscenarios] = useState<Escenario[] | null>(null);
  const [escenarioActivo, setEscenarioActivo] = useState<Escenario | null>(null);
  const [ticker, setTicker] = useState<string | null>(null);
  const [resultado, setResultado] = useState<HistorialEscenario | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Escenario[]>("/precios/escenarios")
      .then(setEscenarios)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error al cargar los escenarios"));
  }, []);

  async function verTicker(escenario: Escenario, tickerElegido: string) {
    setError(null);
    setEscenarioActivo(escenario);
    setTicker(tickerElegido);
    setResultado(null);
    setCargando(true);
    try {
      const data = await api.get<HistorialEscenario>(
        `/precios/escenarios/${escenario.id}/historial?ticker=${tickerElegido}`
      );
      setResultado(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cargar el historial de ese escenario");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="mb-2 text-2xl font-bold text-ink">Escenarios históricos</h1>
        <p className="mb-6 text-sm text-ink/40">
          Explora cómo se comportaron distintos activos durante eventos reales del mercado.
        </p>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {!escenarios ? (
          <p className="text-ink/40">Cargando...</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {escenarios.map((esc) => (
              <Card key={esc.id}>
                <h2 className="mb-1 font-mono text-sm font-bold uppercase tracking-wide text-ink">
                  {esc.nombre}
                </h2>
                <p className="mb-2 text-xs text-ink/40">
                  {esc.fecha_inicio} a {esc.fecha_fin}
                </p>
                <p className="mb-3 text-sm text-ink/60">{esc.descripcion}</p>
                <div className="flex flex-wrap gap-2">
                  {esc.tickers_sugeridos.map((t) => (
                    <button
                      key={t}
                      onClick={() => verTicker(esc, t)}
                      className={`rounded-full px-2.5 py-1 font-mono text-xs uppercase tracking-wide ${
                        escenarioActivo?.id === esc.id && ticker === t
                          ? "bg-accent text-white"
                          : "bg-ink/5 text-ink/70 hover:bg-ink/10"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {cargando && <p className="mt-6 text-ink/40">Cargando historial...</p>}

        {resultado && escenarioActivo && (
          <Card className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">
                {resultado.ticker} durante {escenarioActivo.nombre}
              </h2>
              <Badge tone={resultado.rendimiento_porcentaje >= 0 ? "ganancia" : "perdida"}>
                {formatoPorcentaje(resultado.rendimiento_porcentaje)}
              </Badge>
            </div>
            <PrecioChart historial={resultado.historial} />
          </Card>
        )}
      </div>
    </main>
  );
}
