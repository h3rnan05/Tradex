"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface RetoOut {
  id: string;
  grupo_id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  capital_inicial: string;
  pausado: boolean;
  escenario_id: string | null;
}

interface ParticipanteResumen {
  alumno_id: string;
  nombre: string;
  capital_disponible: string;
  valor_total: string;
  n_operaciones: number;
  pnl_pct: string;
}

function estadoReto(r: RetoOut): { label: string; color: string } {
  const ahora = Date.now();
  const inicio = new Date(r.fecha_inicio).getTime();
  const fin = new Date(r.fecha_fin).getTime();
  if (r.pausado) return { label: "PAUSADO", color: "#f59e0b" };
  if (ahora < inicio) return { label: "PRÓXIMO", color: "#60a5fa" };
  if (ahora > fin) return { label: "FINALIZADO", color: "#6b7280" };
  return { label: "ACTIVO", color: "#22c55e" };
}

export default function MaestroRetosPage() {
  const { t } = useLanguage();
  const [retos, setRetos] = useState<RetoOut[]>([]);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [participantes, setParticipantes] = useState<ParticipanteResumen[]>([]);
  const [cargando, setCargando] = useState(false);
  const [accionando, setAccionando] = useState(false);

  useEffect(() => {
    api.get<RetoOut[]>("/maestro/retos").then(setRetos).catch(() => {});
  }, []);

  function seleccionarReto(id: string) {
    if (seleccionado === id) { setSeleccionado(null); return; }
    setSeleccionado(id);
    setCargando(true);
    api.get<ParticipanteResumen[]>(`/retos/${id}/participantes-resumen`)
      .then(setParticipantes)
      .catch(() => setParticipantes([]))
      .finally(() => setCargando(false));
  }

  async function togglePausa(reto: RetoOut) {
    setAccionando(true);
    try {
      const endpoint = reto.pausado ? `/retos/${reto.id}/reanudar` : `/retos/${reto.id}/pausar`;
      await api.post(endpoint, {});
      setRetos((prev) => prev.map((r) => r.id === reto.id ? { ...r, pausado: !r.pausado } : r));
    } catch {}
    setAccionando(false);
  }

  const retoSel = retos.find((r) => r.id === seleccionado);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-mono text-lg font-black uppercase tracking-widest text-fg">
            {t("nav.challenges")}
          </h1>
          <span className="font-mono text-[11px] text-fg/40">{retos.length} reto(s)</span>
        </div>

        {retos.length === 0 && (
          <p className="font-mono text-sm text-fg/40">No hay retos en tus grupos aún.</p>
        )}

        <div className="flex flex-col gap-3">
          {retos.map((reto) => {
            const estado = estadoReto(reto);
            const abierto = seleccionado === reto.id;
            return (
              <div key={reto.id} className="border border-fg/15 bg-panel">
                {/* Row header */}
                <div className="flex items-center gap-4 px-4 py-3">
                  <button
                    onClick={() => seleccionarReto(reto.id)}
                    className="flex flex-1 items-center gap-4 text-left"
                  >
                    <span className="font-mono text-[9px] font-black uppercase tracking-widest" style={{ color: estado.color }}>
                      {estado.label}
                    </span>
                    <span className="font-mono text-sm font-bold text-fg">{reto.nombre}</span>
                    <span className="font-mono text-[10px] text-fg/40">
                      {new Date(reto.fecha_inicio).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                      {" → "}
                      {new Date(reto.fecha_fin).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                    </span>
                    {reto.escenario_id && (
                      <span className="font-mono text-[9px] uppercase text-fg/30">CRISIS</span>
                    )}
                  </button>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => togglePausa(reto)}
                      disabled={accionando || estadoReto(reto).label === "FINALIZADO" || estadoReto(reto).label === "PRÓXIMO"}
                      className="border border-fg/20 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-fg/60 hover:border-accent hover:text-fg disabled:opacity-30 transition-colors"
                    >
                      {reto.pausado ? "▶ REANUDAR" : "⏸ PAUSAR"}
                    </button>
                    <Link
                      href={`/maestro/retos/${reto.id}`}
                      className="border border-fg/20 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-fg/60 hover:border-accent hover:text-fg transition-colors"
                    >
                      VER →
                    </Link>
                  </div>
                </div>

                {/* Participantes panel */}
                {abierto && (
                  <div className="border-t border-fg/10 px-4 pb-4 pt-3">
                    {cargando ? (
                      <p className="font-mono text-[10px] text-fg/40">Cargando participantes…</p>
                    ) : participantes.length === 0 ? (
                      <p className="font-mono text-[10px] text-fg/40">Sin participantes aún.</p>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-fg/10">
                            {["#", "ALUMNO", "CAPITAL", "VALOR TOTAL", "OPS", "P&L"].map((h) => (
                              <th key={h} className="pb-2 pr-4 text-left font-mono text-[9px] font-bold uppercase tracking-widest text-fg/40">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {participantes.map((p, i) => {
                            const pnl = Number(p.pnl_pct);
                            return (
                              <tr key={p.alumno_id} className="border-b border-fg/5 last:border-b-0">
                                <td className="py-2 pr-4 font-mono text-[10px] text-fg/40">{i + 1}</td>
                                <td className="py-2 pr-4 font-mono text-[11px] font-bold text-fg">{p.nombre}</td>
                                <td className="py-2 pr-4 font-mono text-[10px] tabular-nums text-fg/70">
                                  ${Number(p.capital_disponible).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-2 pr-4 font-mono text-[10px] tabular-nums text-fg/70">
                                  ${Number(p.valor_total).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-2 pr-4 font-mono text-[10px] tabular-nums text-fg/50">{p.n_operaciones}</td>
                                <td className={`py-2 font-mono text-[10px] font-bold tabular-nums ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                                  {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
