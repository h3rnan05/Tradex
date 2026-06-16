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
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Ranking del grupo</h1>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {!ranking ? (
          <p className="text-slate-500">Cargando...</p>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-600">
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
                    className={`border-t border-slate-100 ${
                      entrada.alumno_id === sesion?.userId ? "bg-slate-50 font-medium" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3 text-slate-900">{entrada.nombre}</td>
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
