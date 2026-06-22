"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Badge, Card, StatTile, formatoMoneda, formatoPorcentaje } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface RetoOut {
  id: string;
  grupo_id: string;
  escenario_id: string | null;
  activos_permitidos: string[] | null;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  capital_inicial: string;
}

interface RankingEntry {
  alumno_id: string;
  nombre: string;
  valor_total: string;
  rendimiento_porcentaje: string;
}

export default function RankingRetoPage() {
  const params = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [reto, setReto] = useState<RetoOut | null>(null);
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
    api.get<RetoOut>(`/retos/${params.id}`).then(setReto).catch(() => {});
    cargar();
    const interval = setInterval(cargar, 5000);
    return () => clearInterval(interval);
  }, [params.id]);

  function estado(): { label: string; tone: "ganancia" | "perdida" | "neutral" } {
    if (!reto) return { label: "", tone: "neutral" };
    const ahora = Date.now();
    if (ahora < new Date(reto.fecha_inicio).getTime()) return { label: t("class.upcoming"), tone: "neutral" };
    if (ahora < new Date(reto.fecha_fin).getTime()) return { label: t("class.active"), tone: "ganancia" };
    return { label: t("class.finished"), tone: "perdida" };
  }

  const terminado = reto ? Date.now() >= new Date(reto.fecha_fin).getTime() : false;
  const activos = (reto?.activos_permitidos ?? []).map((a) =>
    a.replace("-USD", "").replace("=X", "").replace(".MX", "")
  );

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold text-fg">{reto?.nombre ?? t("challenge.ranking")}</h1>
        {reto && (
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-fg/50">
            <Badge tone={estado().tone}>{estado().label}</Badge>
            <span className="font-mono text-xs">
              {new Date(reto.fecha_inicio).toLocaleString("es-MX")} → {new Date(reto.fecha_fin).toLocaleString("es-MX")}
            </span>
          </div>
        )}

        {reto && (
          <div className="mb-6 mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatTile label={t("maestro.retos.capital")} value={formatoMoneda(reto.capital_inicial)} />
            <div className="border border-fg/10 bg-panel p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-fg/40">{t("challenges.assets")}</p>
              <p className="mt-1 font-mono text-sm text-fg/80">{activos.length > 0 ? activos.join(", ") : "—"}</p>
            </div>
          </div>
        )}

        <h2 className="mb-3 mt-6 font-mono text-[11px] uppercase tracking-widest text-fg/40">{t("challenge.ranking")}</h2>

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
                    <td className="px-4 py-3 text-fg/40">
                      {i + 1}
                    </td>
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
