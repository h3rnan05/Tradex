"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { api, ApiError } from "@/lib/api";

interface Grupo {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  capital_inicial: string;
  created_at: string;
}

export default function GruposPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [capitalInicial, setCapitalInicial] = useState("10000");
  const [guardando, setGuardando] = useState(false);

  async function cargarGrupos() {
    setCargando(true);
    try {
      const data = await api.get<Grupo[]>("/grupos");
      setGrupos(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar los grupos");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarGrupos();
  }, []);

  async function crearGrupo(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await api.post("/grupos", {
        nombre,
        fecha_inicio: new Date(fechaInicio).toISOString(),
        fecha_fin: new Date(fechaFin).toISOString(),
        capital_inicial: capitalInicial,
      });
      setNombre("");
      setFechaInicio("");
      setFechaFin("");
      setCapitalInicial("10000");
      setMostrarForm(false);
      await cargarGrupos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el grupo");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Mis grupos</h1>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            {mostrarForm ? "Cancelar" : "Crear grupo"}
          </button>
        </div>

        {mostrarForm && (
          <form
            onSubmit={crearGrupo}
            className="mb-6 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre del grupo</label>
              <input
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Fecha inicio</label>
                <input
                  type="date"
                  required
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Fecha fin</label>
                <input
                  type="date"
                  required
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Capital inicial</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={capitalInicial}
                onChange={(e) => setCapitalInicial(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={guardando}
              className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {guardando ? "Creando..." : "Guardar grupo"}
            </button>
          </form>
        )}

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {cargando ? (
          <p className="text-slate-500">Cargando grupos...</p>
        ) : grupos.length === 0 ? (
          <p className="text-slate-500">Todavía no has creado ningún grupo.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Inicio</th>
                  <th className="px-4 py-3">Fin</th>
                  <th className="px-4 py-3">Capital inicial</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => (
                  <tr key={g.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{g.nombre}</td>
                    <td className="px-4 py-3">{new Date(g.fecha_inicio).toLocaleDateString("es-MX")}</td>
                    <td className="px-4 py-3">{new Date(g.fecha_fin).toLocaleDateString("es-MX")}</td>
                    <td className="px-4 py-3">${Number(g.capital_inicial).toLocaleString("es-MX")}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/maestro/grupos/${g.id}`} className="text-slate-700 underline hover:text-slate-900">
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
