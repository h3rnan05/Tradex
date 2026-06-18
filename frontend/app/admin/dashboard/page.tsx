"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface Stats {
  total_usuarios: number;
  total_maestros: number;
  total_alumnos: number;
  total_grupos: number;
  total_operaciones: number;
  total_participaciones: number;
}

interface Grupo {
  id: string;
  nombre: string;
  maestro_nombre: string | null;
  maestro_email: string | null;
  capital_inicial: string;
  fecha_inicio: string;
  fecha_fin: string;
  num_alumnos: number;
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [sponsors, setSponsors] = useState<{id: string, nombre: string}[]>([]);

  useEffect(() => {
    api.get<Stats>("/admin/stats").then(setStats).catch(() => {});
    api.get<Grupo[]>("/admin/grupos").then(setGrupos).catch(() => {});
    api.get<{id: string, nombre: string}[]>("/admin/sponsors").then(setSponsors).catch(() => {});
  }, []);

  async function asignarSponsor(grupoId: string, sponsorId: string) {
    const qs = sponsorId ? "?sponsor_id=" + sponsorId : "";
    await api.post("/admin/grupos/" + grupoId + "/asignar-sponsor" + qs, {});
  }

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <h1 className="mb-6 text-2xl font-bold text-fg">{t("admin.dashboard.title")}</h1>

        {/* Stats */}
        {stats && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: t("admin.dashboard.users"), value: stats.total_usuarios },
              { label: t("admin.dashboard.teachers"), value: stats.total_maestros },
              { label: t("admin.dashboard.students"), value: stats.total_alumnos },
              { label: t("admin.dashboard.groups"), value: stats.total_grupos },
              { label: "Operaciones", value: stats.total_operaciones },
              { label: "Participaciones", value: stats.total_participaciones },
            ].map((s) => (
              <div key={s.label} className="border border-fg/10 bg-panel p-4 text-center">
                <div className="font-mono text-2xl font-bold text-accent">{s.value.toLocaleString()}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-fg/40">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Groups table */}
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">Todos los grupos</h2>
        <div className="overflow-x-auto">
          <table className="w-full border border-fg/10 bg-panel text-sm">
            <thead className="bg-fg/5">
              <tr>
                {["Grupo", t("admin.teachers.title"), "Capital", t("admin.dashboard.students"), t("class.startDate"), t("class.endDate"), "Patrocinador"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-fg/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) => (
                <tr key={g.id} className="border-t border-fg/5 hover:bg-fg/5">
                  <td className="px-4 py-3 font-mono font-semibold text-fg">{g.nombre}</td>
                  <td className="px-4 py-3 font-mono text-xs text-fg/70">{g.maestro_nombre ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">${Number(g.capital_inicial).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs text-fg/70">{g.num_alumnos}</td>
                  <td className="px-4 py-3 font-mono text-xs text-fg/50">{new Date(g.fecha_inicio).toLocaleDateString("es-MX")}</td>
                  <td className="px-4 py-3 font-mono text-xs text-fg/50">{new Date(g.fecha_fin).toLocaleDateString("es-MX")}</td>
                  <td className="px-4 py-3">
                    <select
                      defaultValue=""
                      onChange={(e) => asignarSponsor(g.id, e.target.value)}
                      className="bg-panel font-mono text-xs text-fg/70 border border-fg/20 px-2 py-1"
                    >
                      <option value="">— Sin patrocinador —</option>
                      {sponsors.map((s) => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {grupos.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center font-mono text-sm text-fg/30">Sin grupos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </main>
  );
}
