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
  max_alumnos: number | null;
  activos_permitidos: string[];
  limite_orden_valor: string | null;
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
      <main className="min-h-screen bg-canvas">
        <Navbar />
        <p className="p-6 text-red-600">{error}</p>
      </main>
    );
  }

  if (!grupo) {
    return (
      <main className="min-h-screen bg-canvas">
        <Navbar />
        <p className="p-6 text-ink/40">Cargando...</p>
      </main>
    );
  }

  const holdingsPorAlumno = (alumnoId: string) =>
    grupo.holdings.filter((h) => h.alumno_id === alumnoId && Number(h.cantidad) > 0);

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="mb-1 text-2xl font-bold text-ink">{grupo.nombre}</h1>
        <p className="mb-1 text-sm text-ink/40">
          Capital inicial: ${Number(grupo.capital_inicial).toLocaleString("es-MX")}
          {" · "}
          Alumnos: {grupo.memberships.length}
          {grupo.max_alumnos !== null && ` / ${grupo.max_alumnos}`}
        </p>
        <p className="mb-6 text-sm text-ink/40">
          Activos permitidos: {grupo.activos_permitidos.join(", ")}
          {grupo.limite_orden_valor && (
            <>
              {" · "}
              Límite por orden: ${Number(grupo.limite_orden_valor).toLocaleString("es-MX")}
            </>
          )}
        </p>

        {grupo.max_alumnos !== null && grupo.memberships.length >= grupo.max_alumnos ? (
          <p className="mb-8 text-sm text-perdida">
            Este grupo alcanzó el límite de {grupo.max_alumnos} alumnos.
          </p>
        ) : (
          <form onSubmit={invitarAlumno} className="mb-8 flex items-end gap-3 rounded-lg border border-ink/10 bg-white p-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-ink/70">
                Correo del alumno a invitar
              </label>
              <input
                type="email"
                required
                value={emailInvitar}
                onChange={(e) => setEmailInvitar(e.target.value)}
                className="w-full rounded-md border border-ink/20 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/80"
            >
              Invitar
            </button>
          </form>
        )}
        {mensajeInvitar && <p className="mb-6 text-sm text-ink/60">{mensajeInvitar}</p>}

        <h2 className="mb-3 text-lg font-semibold text-ink">Alumnos</h2>
        <div className="mb-8 overflow-hidden rounded-lg border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-ink/5 text-left text-ink/60">
              <tr>
                <th className="px-4 py-3">Alumno</th>
                <th className="px-4 py-3">Capital disponible</th>
                <th className="px-4 py-3">Posiciones abiertas</th>
              </tr>
            </thead>
            <tbody>
              {grupo.memberships.map((m) => (
                <tr key={m.id} className="border-t border-ink/5">
                  <td className="px-4 py-3 font-medium text-ink">{m.alumno_id}</td>
                  <td className="px-4 py-3">${Number(m.capital_disponible).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3">{holdingsPorAlumno(m.alumno_id).length}</td>
                </tr>
              ))}
              {grupo.memberships.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-ink/40">
                    Aún no hay alumnos en este grupo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h2 className="mb-3 text-lg font-semibold text-ink">Últimas operaciones</h2>
        <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-ink/5 text-left text-ink/60">
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
                <tr key={o.id} className="border-t border-ink/5">
                  <td className="px-4 py-3">{new Date(o.timestamp).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3 font-medium">{o.ticker}</td>
                  <td className="px-4 py-3 capitalize">{o.tipo}</td>
                  <td className="px-4 py-3">{o.cantidad}</td>
                  <td className="px-4 py-3">${Number(o.precio_ejecucion).toLocaleString("es-MX")}</td>
                </tr>
              ))}
              {grupo.ordenes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-ink/40">
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
