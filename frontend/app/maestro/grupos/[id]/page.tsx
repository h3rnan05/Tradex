"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { api, ApiError } from "@/lib/api";

interface Membership {
  id: string;
  alumno_id: string;
  capital_disponible: string;
}

interface Holding {
  id: string;
  alumno_id: string;
  ticker: string;
  cantidad: string;
  precio_promedio: string;
}

interface Orden {
  id: string;
  alumno_id: string;
  ticker: string;
  tipo: "compra" | "venta";
  cantidad: string;
  precio_ejecucion: string;
  timestamp: string;
}

interface GrupoDetalle {
  id: string;
  nombre: string;
  capital_inicial: string;
  memberships: Membership[];
  holdings: Holding[];
  ordenes: Orden[];
}

export default function DetalleGrupoPage() {
  const params = useParams<{ id: string }>();
  const [grupo, setGrupo] = useState<GrupoDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailInvitar, setEmailInvitar] = useState("");
  const [mensajeInvitar, setMensajeInvitar] = useState<string | null>(null);

  async function cargar() {
    try {
      const data = await api.get<GrupoDetalle>(`/grupos/${params.id}`);
      setGrupo(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar el grupo");
    }
  }

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 5000);
    return () => clearInterval(interval);
  }, [params.id]);

  async function invitarAlumno(e: React.FormEvent) {
    e.preventDefault();
    setMensajeInvitar(null);
    try {
      await api.post(`/grupos/${params.id}/invitar`, { alumno_email: emailInvitar });
      setMensajeInvitar("Alumno agregado correctamente");
      setEmailInvitar("");
      await cargar();
    } catch (err) {
      setMensajeInvitar(err instanceof ApiError ? err.message : "No se pudo invitar al alumno");
    }
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <p className="p-6 text-red-600">{error}</p>
      </main>
    );
  }

  if (!grupo) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <p className="p-6 text-slate-500">Cargando...</p>
      </main>
    );
  }

  const holdingsPorAlumno = (alumnoId: string) =>
    grupo.holdings.filter((h) => h.alumno_id === alumnoId && Number(h.cantidad) > 0);

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">{grupo.nombre}</h1>
        <p className="mb-6 text-sm text-slate-500">
          Capital inicial: ${Number(grupo.capital_inicial).toLocaleString("es-MX")}
        </p>

        <form onSubmit={invitarAlumno} className="mb-8 flex items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Correo del alumno a invitar
            </label>
            <input
              type="email"
              required
              value={emailInvitar}
              onChange={(e) => setEmailInvitar(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Invitar
          </button>
        </form>
        {mensajeInvitar && <p className="mb-6 text-sm text-slate-600">{mensajeInvitar}</p>}

        <h2 className="mb-3 text-lg font-semibold text-slate-900">Alumnos</h2>
        <div className="mb-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Alumno</th>
                <th className="px-4 py-3">Capital disponible</th>
                <th className="px-4 py-3">Posiciones abiertas</th>
              </tr>
            </thead>
            <tbody>
              {grupo.memberships.map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{m.alumno_id}</td>
                  <td className="px-4 py-3">${Number(m.capital_disponible).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3">{holdingsPorAlumno(m.alumno_id).length}</td>
                </tr>
              ))}
              {grupo.memberships.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-slate-500">
                    Aún no hay alumnos en este grupo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h2 className="mb-3 text-lg font-semibold text-slate-900">Últimas operaciones</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Ticker</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Precio</th>
              </tr>
            </thead>
            <tbody>
              {grupo.ordenes.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{new Date(o.timestamp).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3 font-medium">{o.ticker}</td>
                  <td className="px-4 py-3 capitalize">{o.tipo}</td>
                  <td className="px-4 py-3">{o.cantidad}</td>
                  <td className="px-4 py-3">${Number(o.precio_ejecucion).toLocaleString("es-MX")}</td>
                </tr>
              ))}
              {grupo.ordenes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-slate-500">
                    Todavía no hay operaciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
