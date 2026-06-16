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
  max_alumnos: number | null;
  activos_permitidos: string[];
  limite_orden_valor: string | null;
  comision_porcentaje: string;
  created_at: string;
}

const ACTIVOS_DISPONIBLES = [
  { value: "acciones", label: "Acciones" },
  { value: "indices", label: "Índices" },
  { value: "commodities", label: "Commodities" },
];

export default function GruposPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [nombre, setNombre] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [capitalInicial, setCapitalInicial] = useState("10000");
  const [maxAlumnos, setMaxAlumnos] = useState("");
  const [activosPermitidos, setActivosPermitidos] = useState<string[]>(["acciones"]);
  const [limiteOrden, setLimiteOrden] = useState("");
  const [comisionPorcentaje, setComisionPorcentaje] = useState("");
  const [fechasActivacion, setFechasActivacion] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  function alternarActivo(valor: string) {
    setActivosPermitidos((prev) =>
      prev.includes(valor) ? prev.filter((a) => a !== valor) : [...prev, valor]
    );
  }

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
        max_alumnos: maxAlumnos ? Number(maxAlumnos) : null,
        activos_permitidos: activosPermitidos,
        limite_orden_valor: limiteOrden || null,
        comision_porcentaje: comisionPorcentaje ? Number(comisionPorcentaje) / 100 : 0,
        fases_activo: activosPermitidos
          .filter((tipo) => fechasActivacion[tipo])
          .map((tipo) => ({
            tipo_activo: tipo,
            fecha_activacion: new Date(fechasActivacion[tipo]).toISOString(),
          })),
      });
      setNombre("");
      setFechaInicio("");
      setFechaFin("");
      setCapitalInicial("10000");
      setMaxAlumnos("");
      setActivosPermitidos(["acciones"]);
      setLimiteOrden("");
      setComisionPorcentaje("");
      setFechasActivacion({});
      setMostrarForm(false);
      await cargarGrupos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el grupo");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-fg">Mis grupos</h1>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/80"
          >
            {mostrarForm ? "Cancelar" : "Crear grupo"}
          </button>
        </div>

        {mostrarForm && (
          <form
            onSubmit={crearGrupo}
            className="mb-6 flex flex-col gap-4 rounded-lg border border-fg/10 bg-panel p-6"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-fg/70">Nombre del grupo</label>
              <input
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-md border border-fg/20 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-fg/70">Fecha inicio</label>
                <input
                  type="date"
                  required
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full rounded-md border border-fg/20 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-fg/70">Fecha fin</label>
                <input
                  type="date"
                  required
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full rounded-md border border-fg/20 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-fg/70">Capital inicial</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={capitalInicial}
                  onChange={(e) => setCapitalInicial(e.target.value)}
                  className="w-full rounded-md border border-fg/20 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-fg/70">
                  Máximo de alumnos (opcional)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={maxAlumnos}
                  onChange={(e) => setMaxAlumnos(e.target.value)}
                  placeholder="Sin límite"
                  className="w-full rounded-md border border-fg/20 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-fg/70">
                Límite por orden, en monto (opcional)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={limiteOrden}
                onChange={(e) => setLimiteOrden(e.target.value)}
                placeholder="Sin límite"
                className="w-full rounded-md border border-fg/20 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-fg/70">
                Comisión por operación, en % (opcional)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={comisionPorcentaje}
                onChange={(e) => setComisionPorcentaje(e.target.value)}
                placeholder="0"
                className="w-full rounded-md border border-fg/20 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-fg/70">Tipos de activos permitidos</label>
              <div className="flex flex-col gap-3">
                {ACTIVOS_DISPONIBLES.map((activo) => (
                  <div key={activo.value} className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-fg/70">
                      <input
                        type="checkbox"
                        checked={activosPermitidos.includes(activo.value)}
                        onChange={() => alternarActivo(activo.value)}
                      />
                      {activo.label}
                    </label>
                    {activosPermitidos.includes(activo.value) && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-fg/40">Se desbloquea el:</span>
                        <input
                          type="date"
                          value={fechasActivacion[activo.value] ?? ""}
                          onChange={(e) =>
                            setFechasActivacion((prev) => ({ ...prev, [activo.value]: e.target.value }))
                          }
                          placeholder="Desde el inicio"
                          className="rounded-md border border-fg/20 px-2 py-1 text-xs"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={guardando}
              className="self-start rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/80 disabled:opacity-50"
            >
              {guardando ? "Creando..." : "Guardar grupo"}
            </button>
          </form>
        )}

        {error && <p className="mb-4 text-sm text-perdida">{error}</p>}

        {cargando ? (
          <p className="text-fg/40">Cargando grupos...</p>
        ) : grupos.length === 0 ? (
          <p className="text-fg/40">Todavía no has creado ningún grupo.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-fg/10 bg-panel">
            <table className="w-full text-sm">
              <thead className="bg-fg/5 text-left text-fg/60">
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
                  <tr key={g.id} className="border-t border-fg/5">
                    <td className="px-4 py-3 font-medium text-fg">{g.nombre}</td>
                    <td className="px-4 py-3">{new Date(g.fecha_inicio).toLocaleDateString("es-MX")}</td>
                    <td className="px-4 py-3">{new Date(g.fecha_fin).toLocaleDateString("es-MX")}</td>
                    <td className="px-4 py-3">${Number(g.capital_inicial).toLocaleString("es-MX")}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/maestro/grupos/${g.id}`} className="text-fg/70 underline hover:text-fg">
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
