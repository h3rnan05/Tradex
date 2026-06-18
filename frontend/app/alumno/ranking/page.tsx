"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, formatoMoneda, formatoPorcentaje } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

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
  const { t } = useLanguage();
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sesionId, setSesionId] = useState<string | null>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion) { setError("Sesión no encontrada"); return; }
    setSesionId(sesion.userId);
    api
      .get<Portafolio>(`/alumnos/${sesion.userId}/portafolio`)
      .then((portafolio) => api.get<RankingEntry[]>(`/grupos/${portafolio.grupo_id}/ranking`))
      .then(setRanking)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error al cargar el ranking"));
  }, []);

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-2xl font-bold text-fg">{t("ranking.title")}</h1>

        {error && <p className="mb-4 text-sm text-perdida">{error}</p>}

        {!ranking ? (
          <p className="text-fg/40">{t("common.loading")}</p>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-fg/5 text-left text-fg/60">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{t("ranking.student")}</th>
                  <th className="px-4 py-3">{t("ranking.totalValue")}</th>
                  <th className="px-4 py-3">{t("ranking.return")}</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((entrada, i) => (
                  <tr
                    key={entrada.alumno_id}
                    className={`border-t border-fg/5 ${
                      entrada.alumno_id === sesionId ? "bg-canvas font-medium" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-fg/40">{i + 1}</td>
                    <td className="px-4 py-3 text-fg">
                      {entrada.nombre}
                      {entrada.alumno_id === sesionId && (
                        <span className="ml-2 font-mono text-[10px] text-accent">({t("ranking.you")})</span>
                      )}
                    </td>
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
                {ranking.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-fg/40">{t("ranking.noData")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        )}
      </div>
      <Footer />
    </main>
  );
}
