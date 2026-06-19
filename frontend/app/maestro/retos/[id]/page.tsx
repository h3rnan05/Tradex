"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Badge, Card, formatoMoneda, formatoPorcentaje } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface RankingEntry {
  alumno_id: string;
  nombre: string;
  valor_total: string;
  rendimiento_porcentaje: string;
}

export default function RankingRetoPage() {
  const params = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    try {
      const data = await api.get<RankingEntry[]>(`/retos/${params.id}/ranking`);
      setRanking(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("error.loadRanking"));
    }
  }

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 5000);
    return () => clearInterval(interval);
  }, [params.id]);

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-2xl font-bold text-fg">{t("challenge.ranking")}</h1>

        {error && <p className="mb-4 text-sm text-perdida">{error}</p>}

        {!ranking ? (
          <p className="text-fg/40">{t("challenge.loading")}</p>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-fg/5 text-left text-fg/60">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{t("challenge.student")}</th>
                  <th className="px-4 py-3">{t("challenge.totalValue")}</th>
                  <th className="px-4 py-3">{t("challenge.return")}</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.alumno_id} className="border-t border-fg/5">
                    <td className="px-4 py-3 text-fg/40">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-fg">{r.nombre}</td>
                    <td className="px-4 py-3">{formatoMoneda(r.valor_total)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={Number(r.rendimiento_porcentaje) >= 0 ? "ganancia" : "perdida"}>
                        {formatoPorcentaje(r.rendimiento_porcentaje)}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {ranking.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-fg/40">
                      {t("challenge.noParticipants")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </main>
  );
}
