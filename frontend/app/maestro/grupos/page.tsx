"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
  { value: "crypto", label: "Cripto" },
  { value: "forex", label: "Divisas (Forex)" },
];

const ACTIVOS_LABEL: Record<string, string> = Object.fromEntries(
  ACTIVOS_DISPONIBLES.map((a) => [a.value, a.label])
);

const ESTADO_ESTILOS: Record<string, string> = {
  proximo: "bg-fg/10 text-fg/60",
  activo: "bg-ganancia/15 text-ganancia",
  finalizado: "bg-fg/5 text-fg/40",
};

function estadoGrupo(fechaInicio: string, fechaFin: string) {
  const ahora = Date.now();
  const inicio = new Date(fechaInicio).getTime();
  const fin = new Date(fechaFin).getTime();
  if (ahora < inicio) return { key: "proximo", label: "Próximo" };
  if (ahora > fin) return { key: "finalizado", label: "Finalizado" };
  return { key: "activo", label: "Activo" };
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
            className="rounded-none bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/80"
          >
            {mostrarForm ? "Cancelar" : "Crear grupo"}
          </button>
        </div>

        {mostrarForm && (
          <form
            onSubmit={crearGrupo}
            className="mb-6 flex flex-col gap-4 rounded-none border border-fg/10 bg-panel p-6"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-fg/70">Nombre del grupo</label>
              <input
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-none border border-fg/20 px-3 py-2 text-sm"
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
                  className="w-full rounded-none border border-fg/20 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-fg/70">Fecha fin</label>
                <input
                  type="date"
                  required
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full rounded-none border border-fg/20 px-3 py-2 text-sm"
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
                  className="w-full rounded-none border border-fg/20 px-3 py-2 text-sm"
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
                  className="w-full rounded-none border border-fg/20 px-3 py-2 text-sm"
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
                className="w-full rounded-none border border-fg/20 px-3 py-2 text-sm"
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
                className="w-full rounded-none border border-fg/20 px-3 py-2 text-sm"
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
                          className="rounded-none border border-fg/20 px-2 py-1 text-xs"
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
              className="self-start rounded-none bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/80 disabled:opacity-50"
            >
              {guardando ? "Creando..." : "Guardar grupo"}
            </button>
          </form>
        )}

        {error && <p className="mb-4 text-sm text-perdida">{error}</p>}

        {cargando ? (
          <p className="text-fg/40">Cargando grupos...</p>
        ) : grupos.length === 0 ? (
          <div className="rounded-none border border-dashed border-fg/20 bg-panel/50 px-6 py-12 text-center">
            <p className="text-fg/50">Todavía no has creado ningún grupo.</p>
            <button
              onClick={() => setMostrarForm(true)}
              className="mt-4 rounded-none bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/80"
            >
              Crear tu primer grupo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grupos.map((g) => {
              const estado = estadoGrupo(g.fecha_inicio, g.fecha_fin);
              return (
                <div
                  key={g.id}
                  className="flex flex-col gap-4 rounded-none border border-fg/10 bg-panel p-5 transition hover:border-fg/30 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-bold leading-tight text-fg">{g.nombre}</h2>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_ESTILOS[estado.key]}`}
                    >
                      {estado.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-fg/40">Inicio</p>
                      <p className="text-fg/80">{new Date(g.fecha_inicio).toLocaleDateString("es-MX")}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-fg/40">Fin</p>
                      <p className="text-fg/80">{new Date(g.fecha_fin).toLocaleDateString("es-MX")}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-fg/40">Capital inicial</p>
                      <p className="font-medium text-ganancia">
                        ${Number(g.capital_inicial).toLocaleString("es-MX")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-fg/40">Alumnos</p>
                      <p className="text-fg/80">{g.max_alumnos ? `Máx. ${g.max_alumnos}` : "Sin límite"}</p>
                    </div>
                  </div>

                  {g.activos_permitidos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {g.activos_permitidos.map((tipo) => (
                        <span
                          key={tipo}
                          className="rounded-full bg-fg/5 px-2 py-0.5 text-xs text-fg/60"
                        >
                          {ACTIVOS_LABEL[tipo] ?? tipo}
                        </span>
                      ))}
                    </div>
                  )}

                  <Link
                    href={`/maestro/grupos/${g.id}`}
                    className="mt-auto self-start text-sm font-medium text-fg underline hover:text-fg/70"
                  >
                    Ver detalle →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
