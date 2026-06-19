"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface Maestro {
  id: string;
  email: string;
  nombre: string;
  escuela: string | null;
  ciudad: string | null;
  estado: string | null;
  suspendido: boolean;
}

export default function AdminMaestros() {
  const { t } = useLanguage();
  const [maestros, setMaestros] = useState<Maestro[]>([]);

  async function cargar() {
    api.get<Maestro[]>("/admin/maestros").then(setMaestros).catch(() => {});
  }

  useEffect(() => { cargar(); }, []);

  async function toggleSuspender(id: string) {
    await api.post(`/admin/users/${id}/suspender`, {});
    cargar();
  }

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <h1 className="mb-6 text-2xl font-bold text-fg">{t("admin.teachers.title")}</h1>
        <div className="overflow-x-auto">
          <table className="w-full border border-fg/10 bg-panel text-sm">
            <thead className="bg-fg/5">
              <tr>
                {[t("common.name"), t("common.email"), t("profile.school"), t("profile.city"), t("common.status"), ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-fg/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {maestros.map((m) => (
                <tr key={m.id} className={`border-t border-fg/5 ${m.suspendido ? "opacity-40" : "hover:bg-fg/5"}`}>
                  <td className="px-4 py-3 font-mono font-semibold text-fg">
                    {m.nombre}
                    {m.suspendido && <span className="ml-2 font-mono text-[9px] uppercase text-perdida bg-perdida/10 px-1.5 py-0.5">{t("admin.users.suspended")}</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-fg/60">{m.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-fg/60">{m.escuela ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-fg/60">{m.ciudad ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-fg/60">{m.estado ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleSuspender(m.id)}
                      className={`px-3 py-1 font-mono text-[10px] font-bold uppercase transition-colors ${m.suspendido ? "bg-ganancia/10 text-ganancia hover:bg-ganancia/20" : "bg-perdida/10 text-perdida hover:bg-perdida/20"}`}
                    >
                      {m.suspendido ? t("admin.users.reactivate") : t("admin.users.suspend")}
                    </button>
                  </td>
                </tr>
              ))}
              {maestros.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center font-mono text-sm text-fg/30">{t("admin.teachers.noneRegistered")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
