"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { api, ApiError } from "@/lib/api";
import ComentariosMaestro from "@/components/ComentariosMaestro";

interface Membership {
  id: string;
  alumno_id: string;
  capital_disponible: string;
  pausado: boolean;
  created_at: string | null;
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
  comision: string;
  timestamp: string;
}

interface GrupoDetalle {
  id: string;
  nombre: string;
  codigo: string | null;
  capital_inicial: string;
  fecha_inicio: string;
  fecha_fin: string;
  max_alumnos: number | null;
  activos_permitidos: string[];
  limite_orden_valor: string | null;
  comision_porcentaje: string;
  fases_activo: { id: string; tipo_activo: string; fecha_activacion: string }[];
  memberships: Membership[];
  holdings: Holding[];
  ordenes: Orden[];
}

interface EvaluacionEntry {
  alumno_id: string;
  nombre: string;
  escuela: string | null;
  ciudad: string | null;
  estado: string | null;
  posicion: number;
  valor_total: string;
  capital_inicial: string;
  rendimiento: string;
  rendimiento_porcentaje: string;
  comisiones_pagadas: string;
  num_operaciones: number;
  tickers: string[];
  dias_activo: number;
  pausado: boolean;
}

const CAPITALES = [5000, 10000, 25000, 100000];
const COMISIONES = [
  { label: "Gratis (0%)", value: "0" },
  { label: "1%", value: "0.01" },
  { label: "2%", value: "0.02" },
  { label: "5%", value: "0.05" },
  { label: "10%", value: "0.10" },
];
const MERCADOS: { value: string; label: string }[] = [
  { value: "acciones", label: "Acciones" },
  { value: "indices", label: "Índices" },
  { value: "commodities", label: "Commodities" },
  { value: "crypto", label: "Cripto" },
];
const fmt = (v: string | number) =>
  Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export default function DetalleGrupoPage() {
  const params = useParams<{ id: string }>();
  const [grupo, setGrupo] = useState<GrupoDetalle | null>(null);
  const [evaluacion, setEvaluacion] = useState<EvaluacionEntry[]>([]);
  const [tab, setTab] = useState<"config" | "participantes">("participantes");
  const [error, setError] = useState<string | null>(null);

  // Invitar
  const [emailInvitar, setEmailInvitar] = useState("");
  const [mensajeInvitar, setMensajeInvitar] = useState<string | null>(null);

  // Config form state (initialized from grupo)
  const [cfgNombre, setCfgNombre] = useState("");
  const [cfgCapital, setCfgCapital] = useState(10000);
  const [cfgMercados, setCfgMercados] = useState<string[]>(["acciones"]);
  const [cfgFechaInicio, setCfgFechaInicio] = useState("");
  const [cfgFechaFin, setCfgFechaFin] = useState("");
  const [cfgComision, setCfgComision] = useState("0");
  const [cfgLimiteOrden, setCfgLimiteOrden] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [msgConfig, setMsgConfig] = useState<string | null>(null);
  const [ordenExpandida, setOrdenExpandida] = useState<string | null>(null);

  async function cargar() {
    try {
      const data = await api.get<GrupoDetalle>(`/grupos/${params.id}`);
      setGrupo(data);
      // Sync config form
      setCfgNombre(data.nombre);
      const cap = Number(data.capital_inicial);
      setCfgCapital(CAPITALES.includes(cap) ? cap : 10000);
      setCfgMercados(data.activos_permitidos);
      setCfgFechaInicio(data.fecha_inicio.slice(0, 10));
      setCfgFechaFin(data.fecha_fin.slice(0, 10));
      const comVal = Number(data.comision_porcentaje).toFixed(2);
      setCfgComision(comVal === "0.00" ? "0" : comVal);
      setCfgLimiteOrden(data.limite_orden_valor ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar el grupo");
    }
  }

  async function cargarEvaluacion() {
    try {
      const data = await api.get<EvaluacionEntry[]>(`/grupos/${params.id}/evaluacion`);
      setEvaluacion(data);
    } catch {
      // silent
    }
  }

  useEffect(() => {
    cargar();
    cargarEvaluacion();
  }, [params.id]);

  async function invitar(e: React.FormEvent) {
    e.preventDefault();
    setMensajeInvitar(null);
    try {
      await api.post(`/grupos/${params.id}/invitar`, { alumno_email: emailInvitar });
      setMensajeInvitar("Alumno agregado exitosamente");
      setEmailInvitar("");
      cargar();
      cargarEvaluacion();
    } catch (err) {
      setMensajeInvitar(err instanceof ApiError ? err.message : "Error al invitar");
    }
  }

  async function guardarConfig(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setMsgConfig(null);
    try {
      await api.patch(`/grupos/${params.id}`, {
        nombre: cfgNombre,
        capital_inicial: cfgCapital,
        activos_permitidos: cfgMercados,
        fecha_inicio: cfgFechaInicio,
        fecha_fin: cfgFechaFin,
        comision_porcentaje: parseFloat(cfgComision),
        limite_orden_valor: cfgLimiteOrden ? parseFloat(cfgLimiteOrden) : null,
      });
      setMsgConfig("Cambios guardados");
      cargar();
    } catch (err) {
      setMsgConfig(err instanceof ApiError ? err.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function togglePausar(membershipId: string) {
    try {
      await api.post(`/grupos/${params.id}/memberships/${membershipId}/pausar`, {});
      cargar();
      cargarEvaluacion();
    } catch {
      // silent
    }
  }

  if (error) return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <p className="p-6 text-sm text-perdida">{error}</p>
    </main>
  );
  if (!grupo) return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <p className="p-6 text-fg/40">Cargando...</p>
    </main>
  );

  // Map membership id by alumno_id for pause button
  const membershipByAlumno: Record<string, Membership> = {};
  grupo.memberships.forEach((m) => { membershipByAlumno[m.alumno_id] = m; });

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-7xl p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/maestro/grupos" className="font-mono text-[11px] uppercase tracking-widest text-fg/40 hover:text-fg">
              ← Grupos
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-fg">{grupo.nombre}</h1>
            <p className="font-mono text-xs text-fg/50">
              {new Date(grupo.fecha_inicio).toLocaleDateString("es-MX")} →{" "}
              {new Date(grupo.fecha_fin).toLocaleDateString("es-MX")} · Capital inicial:{" "}
              {fmt(grupo.capital_inicial)}
            </p>
            {grupo.codigo && (
              <div className="mt-2 flex items-center gap-2">
                <span className="font-mono text-[11px] text-fg/40 uppercase tracking-widest">Código:</span>
                <span className="font-mono text-lg font-bold tracking-[0.3em] text-accent">{grupo.codigo}</span>
                <button
                  type="button"
                  onClick={async () => {
                    const actualizado = await api.post<GrupoDetalle>(`/grupos/${grupo.id}/regenerar-codigo`, {});
                    setGrupo(actualizado);
                  }}
                  className="border border-fg/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg/50 hover:text-fg"
                >
                  Regenerar
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {(["participantes", "config"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${tab === t ? "bg-accent text-black" : "border border-fg/20 text-fg/60 hover:text-fg"}`}
              >
                {t === "participantes" ? "Tablero" : "Configuración"}
              </button>
            ))}
          </div>
        </div>

        {/* Tab: Configuración */}
        {tab === "config" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <form onSubmit={guardarConfig} className="border border-fg/10 bg-panel p-6 space-y-5">
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-fg/40">Condiciones del grupo</h2>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-fg/50 mb-1">Nombre del reto</label>
                <input
                  value={cfgNombre}
                  onChange={(e) => setCfgNombre(e.target.value)}
                  className="w-full border border-fg/20 bg-canvas px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-fg/50 mb-2">Capital inicial</label>
                <div className="flex gap-2 flex-wrap">
                  {CAPITALES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCfgCapital(c)}
                      className={`px-3 py-1.5 font-mono text-xs transition-colors ${cfgCapital === c ? "bg-accent text-black" : "border border-fg/20 text-fg/60 hover:text-fg"}`}
                    >
                      ${c.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-fg/50 mb-2">Mercados permitidos</label>
                <div className="flex flex-wrap gap-2">
                  {MERCADOS.map((m) => (
                    <label key={m.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cfgMercados.includes(m.value)}
                        onChange={(e) => {
                          if (e.target.checked) setCfgMercados([...cfgMercados, m.value]);
                          else setCfgMercados(cfgMercados.filter((x) => x !== m.value));
                        }}
                        className="accent-accent"
                      />
                      <span className="font-mono text-xs text-fg/70">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-fg/50 mb-1">Fecha inicio</label>
                  <input
                    type="date"
                    value={cfgFechaInicio}
                    onChange={(e) => setCfgFechaInicio(e.target.value)}
                    className="w-full border border-fg/20 bg-canvas px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-fg/50 mb-1">Fecha cierre</label>
                  <input
                    type="date"
                    value={cfgFechaFin}
                    onChange={(e) => setCfgFechaFin(e.target.value)}
                    className="w-full border border-fg/20 bg-canvas px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-fg/50 mb-1">Comisiones</label>
                <select
                  value={cfgComision}
                  onChange={(e) => setCfgComision(e.target.value)}
                  className="w-full border border-fg/20 bg-canvas px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
                >
                  {COMISIONES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-fg/50 mb-1">Límite por orden (USD, opcional)</label>
                <input
                  type="number"
                  value={cfgLimiteOrden}
                  onChange={(e) => setCfgLimiteOrden(e.target.value)}
                  placeholder="Sin límite"
                  className="w-full border border-fg/20 bg-canvas px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
                />
              </div>

              {msgConfig && (
                <p className={`font-mono text-xs ${msgConfig === "Cambios guardados" ? "text-ganancia" : "text-perdida"}`}>
                  {msgConfig}
                </p>
              )}

              <button
                type="submit"
                disabled={guardando}
                className="w-full bg-accent py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-black disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>

            {/* Invite panel */}
            <div className="border border-fg/10 bg-panel p-6">
              <h2 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-fg/40">Agregar participante</h2>
              <form onSubmit={invitar} className="flex gap-2">
                <input
                  value={emailInvitar}
                  onChange={(e) => setEmailInvitar(e.target.value)}
                  placeholder="correo@alumno.com"
                  className="flex-1 border border-fg/20 bg-canvas px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
                />
                <button type="submit" className="bg-accent px-4 py-2 font-mono text-[11px] font-bold uppercase text-black">
                  Agregar
                </button>
              </form>
              {mensajeInvitar && (
                <p className={`mt-2 font-mono text-xs ${mensajeInvitar.includes("exitosamente") ? "text-ganancia" : "text-perdida"}`}>
                  {mensajeInvitar}
                </p>
              )}

              <div className="mt-6">
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">Info del grupo</h3>
                <div className="space-y-1.5 font-mono text-xs text-fg/60">
                  <div className="flex justify-between"><span>Capital inicial</span><span className="text-fg">{fmt(grupo.capital_inicial)}</span></div>
                  <div className="flex justify-between"><span>Comisión</span><span className="text-fg">{(Number(grupo.comision_porcentaje) * 100).toFixed(0)}%</span></div>
                  <div className="flex justify-between"><span>Participantes</span><span className="text-fg">{grupo.memberships.length}</span></div>
                  <div className="flex justify-between"><span>Mercados</span><span className="text-fg">{grupo.activos_permitidos.join(", ")}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Participantes (Tablero de evaluación) */}
        {tab === "participantes" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-fg/40">
                Tablero de evaluación — {evaluacion.length} participantes
              </h2>
              <button
                onClick={() => { cargar(); cargarEvaluacion(); }}
                className="border border-fg/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-fg/50 hover:text-fg"
              >
                Actualizar
              </button>
            </div>

            {evaluacion.length === 0 ? (
              <div className="border border-fg/10 bg-panel p-8 text-center">
                <p className="font-mono text-sm text-fg/40">Aún no hay participantes en este grupo.</p>
                <button onClick={() => setTab("config")} className="mt-3 font-mono text-xs text-accent underline">
                  Agregar participantes →
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border border-fg/10 bg-panel text-sm">
                  <thead className="bg-fg/5">
                    <tr>
                      {["#", "Nombre", "Valor portafolio", "Rendimiento", "Comisiones", "Ops.", "Activos", "Días", "Escuela", "Ciudad / Estado", ""].map((h) => (
                        <th key={h} className="px-3 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-fg/40">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evaluacion.map((e) => {
                      const m = membershipByAlumno[e.alumno_id];
                      const rend = Number(e.rendimiento_porcentaje);
                      return (
                        <tr key={e.alumno_id} className={`border-t border-fg/5 ${e.pausado ? "opacity-50" : "hover:bg-fg/5"}`}>
                          <td className="px-3 py-3 font-mono text-xs font-bold text-fg/60">#{e.posicion}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-fg">{e.nombre}</span>
                              {e.pausado && (
                                <span className="bg-perdida/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-perdida">
                                  Pausado
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono text-sm font-bold text-fg">{fmt(e.valor_total)}</td>
                          <td className={`px-3 py-3 font-mono text-sm font-semibold ${rend >= 0 ? "text-ganancia" : "text-perdida"}`}>
                            {rend >= 0 ? "+" : ""}{rend.toFixed(2)}%
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-fg/60">{fmt(e.comisiones_pagadas)}</td>
                          <td className="px-3 py-3 font-mono text-xs text-fg/60">{e.num_operaciones}</td>
                          <td className="px-3 py-3 font-mono text-[11px] text-fg/60">
                            {e.tickers.length > 0 ? e.tickers.join(", ") : "—"}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-fg/60">{e.dias_activo}d</td>
                          <td className="px-3 py-3 font-mono text-[11px] text-fg/60">{e.escuela ?? "—"}</td>
                          <td className="px-3 py-3 font-mono text-[11px] text-fg/60">
                            {[e.ciudad, e.estado].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="px-3 py-3">
                            {m && (
                              <button
                                onClick={() => togglePausar(m.id)}
                                className={`px-2 py-1 font-mono text-[10px] font-bold uppercase transition-colors ${e.pausado ? "bg-ganancia/10 text-ganancia hover:bg-ganancia/20" : "bg-perdida/10 text-perdida hover:bg-perdida/20"}`}
                              >
                                {e.pausado ? "Reanudar" : "Pausar"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Orders table */}
            {grupo.ordenes.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">
                  Últimas operaciones del grupo
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border border-fg/10 bg-panel text-sm">
                    <thead className="bg-fg/5">
                      <tr>
                        {["Alumno", "Tipo", "Ticker", "Cantidad", "Precio", "Comisión", "Fecha", ""].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-fg/40">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.ordenes.slice(0, 30).map((o) => {
                        const alumno = evaluacion.find((e) => e.alumno_id === o.alumno_id);
                        const abierta = ordenExpandida === o.id;
                        return (
                          <>
                            <tr
                              key={o.id}
                              className="cursor-pointer border-t border-fg/5 hover:bg-fg/5"
                              onClick={() => setOrdenExpandida(abierta ? null : o.id)}
                            >
                              <td className="px-4 py-2.5 font-mono text-xs text-fg/70">{alumno?.nombre ?? "—"}</td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${o.tipo === "compra" ? "bg-ganancia/10 text-ganancia" : "bg-perdida/10 text-perdida"}`}>
                                  {o.tipo}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 font-mono font-bold text-fg">{o.ticker}</td>
                              <td className="px-4 py-2.5 font-mono text-xs text-fg/70">{Number(o.cantidad).toFixed(4)}</td>
                              <td className="px-4 py-2.5 font-mono text-xs">{fmt(o.precio_ejecucion)}</td>
                              <td className="px-4 py-2.5 font-mono text-xs text-fg/60">{fmt(o.comision)}</td>
                              <td className="px-4 py-2.5 font-mono text-[10px] text-fg/40">
                                {new Date(o.timestamp).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td className="px-2 py-2.5 font-mono text-[10px] text-fg/30">{abierta ? "▲" : "▼"}</td>
                            </tr>
                            {abierta && (
                              <tr key={`${o.id}-fb`} className="border-t border-fg/5 bg-fg/2">
                                <td colSpan={8} className="px-4 pb-3">
                                  <ComentariosMaestro ordenId={o.id} esMaestro={true} />
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
