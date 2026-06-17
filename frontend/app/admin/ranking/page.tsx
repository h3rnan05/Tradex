"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";

interface Entry {
  posicion: number;
  alumno_id: string;
  nombre: string;
  email: string;
  escuela: string | null;
  ciudad: string | null;
  estado: string | null;
  maestro_nombre: string | null;
  grupo_nombre: string | null;
  valor_total: string;
  rendimiento_porcentaje: string;
  num_operaciones: number;
}

interface Maestro {
  id: string;
  nombre: string;
}

export default function AdminRanking() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [maestros, setMaestros] = useState<Maestro[]>([]);
  const [cargando, setCargando] = useState(false);
  const [filtros, setFiltros] = useState({ maestro_id: "", escuela: "", ciudad: "", estado: "" });

  async function cargar() {
    setCargando(true);
    const params = new URLSearchParams();
    if (filtros.maestro_id) params.set("maestro_id", filtros.maestro_id);
    if (filtros.escuela) params.set("escuela", filtros.escuela);
    if (filtros.ciudad) params.set("ciudad", filtros.ciudad);
    if (filtros.estado) params.set("estado", filtros.estado);
    const qs = params.toString();
    api.get<Entry[]>(`/admin/ranking-global${qs ? "?" + qs : ""}`)
      .then(setEntries)
      .catch(() => {})
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    api.get<Maestro[]>("/admin/maestros").then(setMaestros).catch(() => {});
    cargar();
  }, []);

  function fmt(v: string | number) {
    return Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  }

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <h1 className="mb-6 text-2xl font-bold text-fg">Ranking Global</h1>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <select
            value={filtros.maestro_id}
            onChange={(e) => setFiltros({ ...filtros, maestro_id: e.target.value })}
            className="border border-fg/20 bg-panel px-3 py-2 font-mono text-xs text-fg outline-none focus:border-accent"
          >
            <option value="">Todos los maestros</option>
            {maestros.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
          {["escuela", "ciudad", "estado"].map((f) => (
            <input
              key={f}
              placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
              value={filtros[f as keyof typeof filtros]}
              onChange={(e) => setFiltros({ ...filtros, [f]: e.target.value })}
              className="border border-fg/20 bg-panel px-3 py-2 font-mono text-xs text-fg placeholder-fg/30 outline-none focus:border-accent"
            />
          ))}
        </div>
        <button
          onClick={cargar}
          className="mb-6 bg-accent px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-black"
        >
          {cargando ? "Buscando..." : "Filtrar"}
        </button>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border border-fg/10 bg-panel text-sm">
            <thead className="bg-fg/5">
              <tr>
                {["#", "Alumno", "Escuela", "Ciudad", "Estado", "Maestro", "Grupo", "Valor", "Rendimiento", "Ops"].map((h) => (
                  <th key={h} className="px-3 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-fg/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const rend = Number(e.rendimiento_porcentaje);
                return (
                  <tr key={`${e.alumno_id}-${e.grupo_nombre}`} className="border-t border-fg/5 hover:bg-fg/5">
                    <td className="px-3 py-3 font-mono text-xs font-bold text-fg/50">#{e.posicion}</td>
                    <td className="px-3 py-3">
                      <div className="font-mono text-sm font-semibold text-fg">{e.nombre}</div>
                      <div className="font-mono text-[10px] text-fg/40">{e.email}</div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-fg/60">{e.escuela ?? "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-fg/60">{e.ciudad ?? "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-fg/60">{e.estado ?? "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-fg/60">{e.maestro_nombre ?? "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-fg/60">{e.grupo_nombre ?? "—"}</td>
                    <td className="px-3 py-3 font-mono text-sm font-bold text-fg">{fmt(e.valor_total)}</td>
                    <td className={`px-3 py-3 font-mono text-sm font-semibold ${rend >= 0 ? "text-ganancia" : "text-perdida"}`}>
                      {rend >= 0 ? "+" : ""}{rend.toFixed(2)}%
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-fg/60">{e.num_operaciones}</td>
                  </tr>
                );
              })}
              {entries.length === 0 && !cargando && (
                <tr><td colSpan={10} className="px-4 py-8 text-center font-mono text-sm text-fg/30">Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 font-mono text-[10px] text-fg/30">{entries.length} participantes encontrados</p>
      </div>
    </main>
  );
}
