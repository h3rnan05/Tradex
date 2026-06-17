"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/Toast";

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

export default function AdminUsuarios() {
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtrando, setFiltrando] = useState(false);

  async function cargar(q = "") {
    setFiltrando(true);
    try {
      const params = q ? `?escuela=${encodeURIComponent(q)}` : "";
      const data = await api.get<Usuario[]>(`/admin/alumnos${params}`);
      const maestros = await api.get<Usuario[]>("/admin/maestros");
      setUsuarios([...data, ...maestros].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    } catch {
      toast("Error al cargar usuarios", "error");
    } finally {
      setFiltrando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function toggleSuspender(id: string) {
    try {
      await api.post(`/admin/users/${id}/suspender`, {});
      setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, suspendido: !u.suspendido } : u));
      toast("Estado actualizado", "success");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Error", "error");
    }
  }

  async function cambiarRol(id: string, nuevoRol: string) {
    try {
      const updated = await api.post<Usuario>(`/admin/users/${id}/cambiar-rol`, { rol: nuevoRol });
      setUsuarios((prev) => prev.map((u) => u.id === id ? updated : u));
      toast(`Rol cambiado a ${nuevoRol}`, "success");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Error al cambiar rol", "error");
    }
  }

  const filtrados = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h1 className="text-2xl font-bold text-fg">Usuarios</h1>
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
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
                  {["Nombre", "Email", "Rol", "Escuela", "Estado", "Acciones"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-fg/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u) => (
                  <tr key={u.id} className={`border-t border-fg/5 ${u.suspendido ? "opacity-40" : "hover:bg-fg/5"}`}>
                    <td className="px-4 py-3 font-mono font-semibold text-fg">
                      {u.nombre}
                      {u.suspendido && <span className="ml-2 font-mono text-[9px] uppercase text-perdida bg-perdida/10 px-1.5 py-0.5">Suspendido</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-fg/60">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.rol}
                        onChange={(e) => cambiarRol(u.id, e.target.value)}
                        className="border border-fg/20 bg-canvas px-2 py-1 font-mono text-xs text-fg"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-fg/60">{u.escuela ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-fg/60">{u.estado ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSuspender(u.id)}
                        className={`px-3 py-1 font-mono text-[10px] font-bold uppercase transition-colors ${u.suspendido ? "bg-ganancia/10 text-ganancia hover:bg-ganancia/20" : "bg-perdida/10 text-perdida hover:bg-perdida/20"}`}
                      >
                        {u.suspendido ? "Reactivar" : "Suspender"}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center font-mono text-sm text-fg/30">Sin usuarios</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
