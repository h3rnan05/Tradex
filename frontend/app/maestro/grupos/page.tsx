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
  codigo: string | null;
  created_at: string;
}

const ACTIVOS_DISPONIBLES = [
  { value: "acciones", label: "Acciones" },
  { value: "indices", label: "Índices / ETFs" },
  { value: "commodities", label: "Commodities" },
  { value: "crypto", label: "Cripto" },
  { value: "forex", label: "Divisas (Forex)" },
  { value: "bolsa_mx", label: "Bolsa Mexicana (BMV)" },
];

const ACTIVOS_LABEL: Record<string, string> = Object.fromEntries(
  ACTIVOS_DISPONIBLES.map((a) => [a.value, a.label])
);

function estadoGrupo(fechaInicio: string, fechaFin: string) {
  const ahora = Date.now();
  const inicio = new Date(fechaInicio).getTime();
  const fin = new Date(fechaFin).getTime();
  if (ahora < inicio) return { key: "proximo", label: "Próximo" };
  if (ahora > fin) return { key: "finalizado", label: "Finalizado" };
  return { key: "activo", label: "Activo" };
}

const ESTADO_CLASE: Record<string, string> = {
  proximo: "border-accent/40 bg-accent/10 text-accent",
  activo: "border-ganancia/40 bg-ganancia/10 text-ganancia",
  finalizado: "border-fg/20 bg-fg/5 text-fg/40",
};

function diasRestantes(fechaFin: string) {
  const diff = new Date(fechaFin).getTime() - Date.now();
  const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (dias < 0) return null;
  if (dias === 0) return "Termina hoy";
  if (dias === 1) return "1 día restante";
  return `${dias} días restantes`;
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

  useEffect(() => { cargarGrupos(); }, []);

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
      setNombre(""); setFechaInicio(""); setFechaFin("");
      setCapitalInicial("10000"); setMaxAlumnos("");
      setActivosPermitidos(["acciones"]); setLimiteOrden("");
      setComisionPorcentaje(""); setFechasActivacion({});
      setMostrarForm(false);
      await cargarGrupos();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el grupo");
    } finally {
      setGuardando(false);
    }
  }

  const activos = grupos.filter((g) => estadoGrupo(g.fecha_inicio, g.fecha_fin).key === "activo");
  const proximos = grupos.filter((g) => estadoGrupo(g.fecha_inicio, g.fecha_fin).key === "proximo");
  const finalizados = grupos.filter((g) => estadoGrupo(g.fecha_inicio, g.fecha_fin).key === "finalizado");

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />

      <div className="mx-auto max-w-5xl p-4 md:p-8">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-fg/40">Panel del maestro</p>
            <h1 className="mt-1 text-3xl font-bold text-fg">Mis grupos</h1>
          </div>
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className={`flex items-center gap-2 rounded-none px-5 py-2.5 font-mono text-sm font-bold uppercase tracking-wide transition-colors ${
              mostrarForm
                ? "border border-fg/20 bg-transparent text-fg/60 hover:bg-fg/5"
                : "bg-accent text-black hover:opacity-90"
            }`}
          >
            {mostrarForm ? "✕ Cancelar" : "+ Nuevo grupo"}
          </button>
        </div>

        {/* Form */}
        {mostrarForm && (
          <div className="mb-8 border border-accent/30 bg-panel">
            <div className="border-b border-fg/10 px-6 py-4">
              <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-fg">Crear nuevo grupo</h2>
            </div>
            <form onSubmit={crearGrupo} className="p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-fg/50">Nombre del grupo</label>
                  <input
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Finanzas 1A — Ene 2025"
                    className="w-full rounded-none border border-fg/20 bg-canvas px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-fg/50">Fecha inicio</label>
                  <input type="date" required value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full rounded-none border border-fg/20 bg-canvas px-3 py-2.5 text-sm focus:border-accent focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-fg/50">Fecha fin</label>
                  <input type="date" required value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full rounded-none border border-fg/20 bg-canvas px-3 py-2.5 text-sm focus:border-accent focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-fg/50">Capital inicial (USD)</label>
                  <input type="number" min="0" step="0.01" required value={capitalInicial} onChange={(e) => setCapitalInicial(e.target.value)}
                    className="w-full rounded-none border border-fg/20 bg-canvas px-3 py-2.5 font-mono text-sm focus:border-accent focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-fg/50">Máx. alumnos <span className="normal-case text-fg/30">(opcional)</span></label>
                  <input type="number" min="1" value={maxAlumnos} onChange={(e) => setMaxAlumnos(e.target.value)}
                    placeholder="Sin límite"
                    className="w-full rounded-none border border-fg/20 bg-canvas px-3 py-2.5 text-sm focus:border-accent focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-fg/50">Límite por orden <span className="normal-case text-fg/30">(opcional)</span></label>
                  <input type="number" min="0" value={limiteOrden} onChange={(e) => setLimiteOrden(e.target.value)}
                    placeholder="Sin límite"
                    className="w-full rounded-none border border-fg/20 bg-canvas px-3 py-2.5 text-sm focus:border-accent focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-fg/50">Comisión por operación % <span className="normal-case text-fg/30">(opcional)</span></label>
                  <input type="number" min="0" step="0.01" value={comisionPorcentaje} onChange={(e) => setComisionPorcentaje(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-none border border-fg/20 bg-canvas px-3 py-2.5 text-sm focus:border-accent focus:outline-none" />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-3 block font-mono text-[11px] uppercase tracking-widest text-fg/50">Mercados habilitados</label>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {ACTIVOS_DISPONIBLES.map((activo) => (
                      <div key={activo.value}>
                        <button
                          type="button"
                          onClick={() => alternarActivo(activo.value)}
                          className={`w-full rounded-none border px-3 py-2.5 text-left text-sm transition-colors ${
                            activosPermitidos.includes(activo.value)
                              ? "border-accent bg-accent/10 text-fg"
                              : "border-fg/15 bg-canvas text-fg/50 hover:border-fg/30"
                          }`}
                        >
                          {activo.label}
                        </button>
                        {activosPermitidos.includes(activo.value) && (
                          <div className="mt-1 flex items-center gap-1.5 border border-t-0 border-accent/20 bg-accent/5 px-3 py-1.5">
                            <span className="font-mono text-[10px] text-fg/40">Desbloquea:</span>
                            <input
                              type="date"
                              value={fechasActivacion[activo.value] ?? ""}
                              onChange={(e) => setFechasActivacion((prev) => ({ ...prev, [activo.value]: e.target.value }))}
                              className="flex-1 rounded-none border border-fg/20 bg-canvas px-1.5 py-0.5 font-mono text-[11px]"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-perdida">{error}</p>}

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-none bg-accent px-6 py-2.5 font-mono text-sm font-bold uppercase tracking-wide text-black hover:opacity-90 disabled:opacity-50"
                >
                  {guardando ? "Creando..." : "Crear grupo"}
                </button>
              </div>
            </form>
          </div>
        )}

        {error && !mostrarForm && <p className="mb-4 text-sm text-perdida">{error}</p>}

        {cargando ? (
          <div className="flex items-center gap-3 py-12 text-fg/40">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-fg/20 border-t-fg/60" />
            <span className="font-mono text-sm">Cargando grupos...</span>
          </div>
        ) : grupos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-none border border-dashed border-fg/20 py-20 text-center">
            <p className="font-mono text-4xl font-bold text-fg/10">TRADEX</p>
            <p className="mt-3 font-medium text-fg/50">Todavía no tienes ningún grupo</p>
            <p className="mt-1 text-sm text-fg/30">Crea tu primer grupo para compartir el código con tus alumnos</p>
            <button
              onClick={() => setMostrarForm(true)}
              className="mt-6 rounded-none bg-accent px-5 py-2.5 font-mono text-sm font-bold uppercase tracking-wide text-black hover:opacity-90"
            >
              + Crear primer grupo
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {activos.length > 0 && <GrupoSeccion titulo="Activos" grupos={activos} />}
            {proximos.length > 0 && <GrupoSeccion titulo="Próximos" grupos={proximos} />}
            {finalizados.length > 0 && <GrupoSeccion titulo="Finalizados" grupos={finalizados} />}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}

function GrupoSeccion({ titulo, grupos }: { titulo: string; grupos: Grupo[] }) {
  return (
    <div>
      <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">{titulo}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grupos.map((g) => <GrupoCard key={g.id} grupo={g} />)}
      </div>
    </div>
  );
}

function GrupoCard({ grupo: g }: { grupo: Grupo }) {
  const estado = estadoGrupo(g.fecha_inicio, g.fecha_fin);
  const restantes = diasRestantes(g.fecha_fin);

  return (
    <div className="group flex flex-col rounded-none border border-fg/10 bg-panel transition-all hover:border-fg/25 hover:shadow-md">
      {/* Card header */}
      <div className="border-b border-fg/8 px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-bold leading-snug text-fg">{g.nombre}</h2>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${ESTADO_CLASE[estado.key]}`}>
            {estado.label}
          </span>
        </div>
        {g.codigo && (
          <p className="mt-2 font-mono text-xs text-fg/40">
            Código: <span className="font-bold tracking-widest text-accent">{g.codigo}</span>
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-px bg-fg/5 border-b border-fg/8">
        <div className="bg-panel px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-fg/40">Capital</p>
          <p className="mt-0.5 font-mono text-sm font-bold text-ganancia">
            ${Number(g.capital_inicial).toLocaleString("es-MX")}
          </p>
        </div>
        <div className="bg-panel px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-fg/40">Alumnos</p>
          <p className="mt-0.5 font-mono text-sm font-bold text-fg">
            {g.max_alumnos ? `Máx. ${g.max_alumnos}` : "Ilimitado"}
          </p>
        </div>
        <div className="bg-panel px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-fg/40">Inicio</p>
          <p className="mt-0.5 font-mono text-xs text-fg/70">
            {new Date(g.fecha_inicio).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="bg-panel px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-widest text-fg/40">Fin</p>
          <p className="mt-0.5 font-mono text-xs text-fg/70">
            {new Date(g.fecha_fin).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Markets */}
      <div className="px-5 py-3">
        {g.activos_permitidos.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {g.activos_permitidos.map((tipo) => (
              <span key={tipo} className="rounded-full border border-fg/10 bg-fg/5 px-2 py-0.5 font-mono text-[10px] text-fg/60">
                {ACTIVOS_LABEL[tipo] ?? tipo}
              </span>
            ))}
          </div>
        ) : (
          <p className="font-mono text-[11px] text-fg/30">Sin mercados configurados</p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-fg/8 px-5 py-3 flex items-center justify-between">
        {restantes && estado.key === "activo" ? (
          <span className="font-mono text-[10px] text-fg/40">{restantes}</span>
        ) : <span />}
        <Link
          href={`/maestro/grupos/${g.id}`}
          className="rounded-none bg-ink px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-white opacity-80 transition-opacity hover:opacity-100 group-hover:opacity-100"
        >
          Ver detalle →
        </Link>
      </div>
    </div>
  );
}
