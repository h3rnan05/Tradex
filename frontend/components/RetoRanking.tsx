"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Badge, Card, formatoMoneda, formatoPorcentaje } from "@/components/primitives";
import { api } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

interface RetoOut {
  id: string;
  nombre: string;
  escenario_id: string | null;
  fecha_inicio: string;
  fecha_fin: string;
}

interface RankingEntry {
  alumno_id: string;
  nombre: string;
  valor_total: string;
  rendimiento_porcentaje: string;
}

const MEDALLAS = ["🥇", "🥈", "🥉"];

/**
 * Vista dedicada del ranking del reto: muestra las posiciones de todos los
 * jugadores ordenadas por valor del portafolio, con podio y resaltado del
 * alumno actual. Se actualiza en vivo conforme avanza la crisis.
 */
export default function RetoRanking({ retoId }: { retoId: string }) {
  const { t } = useLanguage();
  const [reto, setReto] = useState<RetoOut | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const sesionId = obtenerSesion()?.userId ?? null;

  useEffect(() => {
    api.get<RetoOut>(`/retos/${retoId}`).then(setReto).catch(() => {});
    const cargar = () => api.get<RankingEntry[]>(`/retos/${retoId}/ranking`).then(setRanking).catch(() => {});
    cargar();
    const iv = setInterval(cargar, 5000);
    return () => clearInterval(iv);
  }, [retoId]);

  const terminado = reto ? Date.now() >= new Date(reto.fecha_fin).getTime() : false;
  const miPosicion = ranking.findIndex((r) => r.alumno_id === sesionId);

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        {/* Encabezado */}
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-accent">
            {t("challenge.ranking")}
          </span>
          {reto && <h1 className="text-2xl font-bold text-fg">{reto.nombre}</h1>}
        </div>
        <p className="mb-6 text-sm text-fg/50">
          {ranking.length} {ranking.length === 1 ? "jugador" : "jugadores"}
          {miPosicion >= 0 && ` · vas en el lugar #${miPosicion + 1}`}
        </p>

        {/* Podio */}
        {ranking.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-3">
            {[1, 0, 2].map((idx) => {
              const r = ranking[idx];
              if (!r) return <div key={idx} />;
              const alturas = ["h-24", "h-32", "h-20"];
              const yo = r.alumno_id === sesionId;
              return (
                <div key={r.alumno_id} className="flex flex-col items-center justify-end">
                  <span className="mb-1 text-2xl">{MEDALLAS[idx]}</span>
                  <span className={`mb-1 max-w-full truncate text-center text-sm font-bold ${yo ? "text-accent" : "text-fg"}`}>
                    {r.nombre}
                  </span>
                  <span className="mb-2 font-mono text-[11px] tabular-nums text-fg/50">
                    {formatoMoneda(r.valor_total)}
                  </span>
                  <div className={`flex w-full items-center justify-center ${alturas[idx === 1 ? 1 : idx === 0 ? 0 : 2]} ${idx === 0 ? "bg-accent" : "bg-fg/10"}`}>
                    <span className={`font-mono text-xl font-black ${idx === 0 ? "text-black" : "text-fg/50"}`}>
                      {idx + 1}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabla completa */}
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-fg/5 text-left text-fg/60">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{t("ranking.student")}</th>
                <th className="px-4 py-3 text-right">{t("ranking.totalValue")}</th>
                <th className="px-4 py-3 text-right">{t("ranking.return")}</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => {
                const yo = r.alumno_id === sesionId;
                return (
                  <tr key={r.alumno_id} className={`border-t border-fg/5 ${yo ? "bg-accent/10 font-medium" : ""}`}>
                    <td className="px-4 py-3 text-fg/40">{terminado && i < 3 ? MEDALLAS[i] : i + 1}</td>
                    <td className="px-4 py-3 text-fg">
                      {r.nombre}
                      {yo && <span className="ml-2 font-mono text-[10px] text-accent">({t("ranking.you")})</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatoMoneda(r.valor_total)}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone={Number(r.rendimiento_porcentaje) >= 0 ? "ganancia" : "perdida"}>
                        {formatoPorcentaje(r.rendimiento_porcentaje)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {ranking.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center font-mono text-sm text-fg/30">
                    {t("challenge.noParticipants")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </main>
  );
}
