"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";

interface Grupo {
  id: string;
  nombre: string;
  maestro_nombre: string | null;
  capital_inicial: string;
  fecha_inicio: string;
  fecha_fin: string;
  num_alumnos: number;
  num_operaciones: number;
  activos_permitidos: string[];
}

interface RankingEntry {
  posicion: number;
  nombre: string;
  escuela: string | null;
  ciudad: string | null;
  estado: string | null;
  valor_total: number;
  rendimiento_porcentaje: number;
  num_operaciones: number;
  pausado: boolean;
}

function fmt(v: number | string) {
  return Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export default function SponsorDashboard() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<string | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [cargandoRanking, setCargandoRanking] = useState(false);

  useEffect(() => {
    api.get<Grupo[]>("/sponsor/mis-grupos").then((data) => {
      setGrupos(data);
      if (data.length > 0) setSelectedGrupo(data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedGrupo) return;
    setCargandoRanking(true);
    api.get<RankingEntry[]>(`/sponsor/ranking/${selectedGrupo}`)
      .then(setRanking)
      .catch(() => {})
      .finally(() => setCargandoRanking(false));
  }, [selectedGrupo]);

  const grupoActual = grupos.find((g) => g.id === selectedGrupo);

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <h1 className="mb-2 text-2xl font-bold text-fg">Panel del Patrocinador</h1>
        <p className="mb-6 font-mono text-sm text-fg/40">
          Vista de solo lectura · {grupos.length} grupo{grupos.length !== 1 ? "s" : ""} patrocinado{grupos.length !== 1 ? "s" : ""}
        </p>

        {grupos.length === 0 ? (
          <div className="border border-fg/10 bg-panel p-8 text-center">
            <p className="font-mono text-sm text-fg/40">Aún no tienes grupos asignados. Contacta al administrador.</p>
          </div>
        ) : (
          <>
            {grupos.length > 1 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {grupos.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGrupo(g.id)}
                    className={`px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${selectedGrupo === g.id ? "bg-accent text-black" : "border border-fg/20 text-fg/60 hover:text-fg"}`}
                  >
                    {g.nombre}
                  </button>
                ))}
              </div>
            )}

            {grupoActual && (
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { label: "Grupo", value: grupoActual.nombre },
                  { label: "Maestro", value: grupoActual.maestro_nombre ?? "—" },
                  { label: "Capital", value: fmt(grupoActual.capital_inicial) },
                  { label: "Alumnos", value: String(grupoActual.num_alumnos) },
                  { label: "Operaciones", value: String(grupoActual.num_operaciones) },
                  { label: "Mercados", value: grupoActual.activos_permitidos.join(", ") },
                ].map((s) => (
                  <div key={s.label} className="border border-fg/10 bg-panel p-3">
                    <div className="font-mono text-xs font-bold text-fg">{s.value}</div>
                    <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-fg/40">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">Ranking de participantes</h2>
            {cargandoRanking ? (
              <div className="border border-fg/10 bg-panel p-8 text-center font-mono text-sm text-fg/30">Cargando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border border-fg/10 bg-panel text-sm">
                  <thead className="bg-fg/5">
                    <tr>
                      {["#", "Nombre", "Escuela", "Ciudad", "Estado", "Valor portafolio", "Rendimiento", "Ops"].map((h) => (
                        <th key={h} className="px-3 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-fg/40">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((e) => {
                      const rend = e.rendimiento_porcentaje;
                      return (
                        <tr key={e.posicion} className={`border-t border-fg/5 ${e.pausado ? "opacity-40" : "hover:bg-fg/5"}`}>
                          <td className="px-3 py-3 font-mono text-xs font-bold text-fg/50">#{e.posicion}</td>
                          <td className="px-3 py-3">
                            <span className="font-mono text-sm font-semibold text-fg">{e.nombre}</span>
                            {e.pausado && <span className="ml-2 font-mono text-[9px] uppercase text-perdida">Pausado</span>}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-fg/60">{e.escuela ?? "—"}</td>
                          <td className="px-3 py-3 font-mono text-xs text-fg/60">{e.ciudad ?? "—"}</td>
                          <td className="px-3 py-3 font-mono text-xs text-fg/60">{e.estado ?? "—"}</td>
                          <td className="px-3 py-3 font-mono text-sm font-bold text-fg">{fmt(e.valor_total)}</td>
                          <td className={`px-3 py-3 font-mono text-sm font-semibold ${rend >= 0 ? "text-ganancia" : "text-perdida"}`}>
                            {rend >= 0 ? "+" : ""}{rend.toFixed(2)}%
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-fg/60">{e.num_operaciones}</td>
                        </tr>
                      );
                    })}
                    {ranking.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-6 text-center font-mono text-sm text-fg/30">Sin participantes aún</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
