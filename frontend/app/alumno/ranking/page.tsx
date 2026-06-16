"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Card, formatoMoneda, formatoPorcentaje } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";

interface Portafolio {
  grupo_id: string;
}

interface RankingEntry {
  alumno_id: string;
  nombre: string;
  valor_total: string;
  rendimiento: string;
  rendimiento_porcentaje: string;
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion) return;
    api
      .get<Portafolio>(`/alumnos/${sesion.userId}/portafolio`)
      .then((portafolio) => api.get<RankingEntry[]>(`/grupos/${portafolio.grupo_id}/ranking`))
      .then(setRanking)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error al cargar el ranking"));
  }, []);

  const sesion = obtenerSesion();

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-2xl font-bold text-ink">Ranking del grupo</h1>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {!ranking ? (
          <p className="text-ink/40">Cargando...</p>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-ink/5 text-left text-ink/60">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Alumno</th>
                  <th className="px-4 py-3">Valor total</th>
                  <th className="px-4 py-3">Rendimiento</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((entrada, i) => (
                  <tr
                    key={entrada.alumno_id}
                    className={`border-t border-ink/5 ${
                      entrada.alumno_id === sesion?.userId ? "bg-canvas font-medium" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-ink/40">{i + 1}</td>
                    <td className="px-4 py-3 text-ink">{entrada.nombre}</td>
                    <td className="px-4 py-3">{formatoMoneda(entrada.valor_total)}</td>
                    <td
                      className={`px-4 py-3 ${
                        Number(entrada.rendimiento) >= 0 ? "text-ganancia" : "text-perdida"
                      }`}
                    >
                      {formatoMoneda(entrada.rendimiento)} ({formatoPorcentaje(entrada.rendimiento_porcentaje)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </main>
  );
}
