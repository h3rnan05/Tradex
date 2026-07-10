"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useLanguage } from "@/lib/i18n";
import Pagination from "@/components/Pagination";
import ConfirmModal from "@/components/ConfirmModal";

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  escuela: string | null;
  ciudad: string | null;
  estado: string | null;
  suspendido: boolean;
}

const ROLES = ["alumno", "maestro", "sponsor"];

type PendingAction =
  | { type: "suspender"; usuario: Usuario }
  | { type: "rol"; usuario: Usuario; nuevoRol: string };

export default function AdminUsuarios() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtrando, setFiltrando] = useState(false);
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const PER_PAGE = 20;

  async function cargar(q = "") {
    setFiltrando(true);
    try {
      const params = q ? `?escuela=${encodeURIComponent(q)}` : "";
      const data = await api.get<Usuario[]>(`/admin/alumnos${params}`);
      const maestros = await api.get<Usuario[]>("/admin/maestros");
      setUsuarios([...data, ...maestros].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch {
      toast(t("admin.users.loadError"), "error");
    } finally {
      setFiltrando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function confirmar() {
    if (!pending) return;
    try {
      if (pending.type === "suspender") {
        await api.post(`/admin/users/${pending.usuario.id}/suspender`, {});
        setUsuarios((prev) => prev.map((u) => u.id === pending.usuario.id ? { ...u, suspendido: !u.suspendido } : u));
        toast(t("admin.users.statusUpdated"), "success");
      } else {
        const updated = await api.post<Usuario>(`/admin/users/${pending.usuario.id}/cambiar-rol`, { rol: pending.nuevoRol });
        setUsuarios((prev) => prev.map((u) => u.id === pending.usuario.id ? updated : u));
        toast(`${t("admin.users.roleChanged")} ${pending.nuevoRol}`, "success");
      }
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t("error.title"), "error");
    } finally {
      setPending(null);
    }
  }

  const filtrados = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtrados.length / PER_PAGE));
  const pagina = filtrados.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const modalTitle = pending?.type === "suspender"
    ? (pending.usuario.suspendido ? t("admin.users.confirmReactivate") : t("admin.users.confirmSuspend"))
    : t("admin.users.confirmRoleChange");
  const modalMsg = pending?.type === "suspender"
    ? `${pending.usuario.nombre} — ${pending.usuario.email}`
    : pending?.type === "rol"
    ? `${pending.usuario.nombre}: ${pending.usuario.rol} → ${pending.nuevoRol}`
    : "";

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <ConfirmModal
        open={!!pending}
        title={modalTitle}
        message={modalMsg}
        danger={pending?.type === "suspender" && !pending.usuario.suspendido}
        confirmLabel={
          pending?.type === "suspender"
            ? (pending.usuario.suspendido ? t("admin.users.reactivate") : t("admin.users.suspend"))
            : t("common.confirm")
        }
        onConfirm={confirmar}
        onCancel={() => setPending(null)}
      />

      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h1 className="text-2xl font-bold text-fg">{t("admin.users.title")}</h1>
          <input
            type="text"
            placeholder={t("admin.users.searchPlaceholder")}
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
            className="w-64 border border-fg/20 bg-panel px-3 py-2 font-mono text-sm text-fg placeholder:text-fg/30"
          />
        </div>

        {filtrando ? (
          <div className="h-48 animate-pulse border border-fg/10 bg-panel" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border border-fg/10 bg-panel text-sm">
              <thead className="bg-fg/5">
                <tr>
                  {[t("common.name"), t("common.email"), t("common.role"), t("profile.school"), t("common.status"), t("common.actions")].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-fg/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagina.map((u) => (
                  <tr key={u.id} className={`border-t border-fg/5 ${u.suspendido ? "opacity-40" : "hover:bg-fg/5"}`}>
                    <td className="px-4 py-3 font-mono font-semibold text-fg">
                      {u.nombre}
                      {u.suspendido && <span className="ml-2 font-mono text-[9px] uppercase text-perdida bg-perdida/10 px-1.5 py-0.5">{t("admin.users.suspended")}</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-fg/60">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.rol}
                        onChange={(e) => setPending({ type: "rol", usuario: u, nuevoRol: e.target.value })}
                        className="border border-fg/20 bg-canvas px-2 py-1 font-mono text-xs text-fg"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{t(`admin.users.role.${r}` as Parameters<typeof t>[0])}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-fg/60">{u.escuela ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-fg/60">{u.estado ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setPending({ type: "suspender", usuario: u })}
                        className={`px-3 py-1 font-mono text-[10px] font-bold uppercase transition-colors ${u.suspendido ? "bg-ganancia/10 text-ganancia hover:bg-ganancia/20" : "bg-perdida/10 text-perdida hover:bg-perdida/20"}`}
                      >
                        {u.suspendido ? t("admin.users.reactivate") : t("admin.users.suspend")}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center font-mono text-sm text-fg/30">{t("common.noData")}</td></tr>
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-2">
              <span className="font-mono text-[10px] text-fg/30">{filtrados.length} {t("admin.users.title").toLowerCase()}</span>
              <Pagination page={page} totalPages={totalPages} onPage={setPage} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
