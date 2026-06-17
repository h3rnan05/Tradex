"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Navbar from "@/components/Navbar";
import TooltipInfo from "@/components/Tooltip";
import { api, ApiError } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";

interface PuntoValor { fecha: string; valor: number }
interface Metricas { volatilidad_anualizada: number | null; sharpe_ratio: number | null; rendimiento_total_pct: number | null }
interface ComparadorData {
  alumno: PuntoValor[];
  sp500: PuntoValor[];
  modelo: PuntoValor[];
  modelo_nombre: string;
  metricas: { alumno: Metricas; sp500: Metricas; modelo: Metricas };
}

const MODELOS = [
  { value: "conservador", label: "Conservador" },
  { value: "moderado", label: "Moderado" },
  { value: "agresivo", label: "Agresivo" },
];

function fmt(v: number | null, suffix = "%") {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}${suffix}`;
}

function sharpeColor(v: number | null) {
  if (v == null) return "text-fg/40";
  if (v >= 1) return "text-ganancia";
  if (v >= 0) return "text-fg";
  return "text-perdida";
}

export default function ComparadorPage() {
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [alumnoId, setAlumnoId] = useState<string | null>(null);
  const [modelo, setModelo] = useState("moderado");
  const [data, setData] = useState<ComparadorData | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const sesion = obtenerSesion();
    if (sesion) {
      setAlumnoId(sesion.userId);
    }
    const gid = localStorage.getItem("tradex_grupo_id");
    if (gid) setGrupoId(gid);
  }, []);

  useEffect(() => {
    if (!alumnoId || !grupoId) return;
    setCargando(true);
    setError("");
    api.get<ComparadorData>(`/comparador/${alumnoId}?grupo_id=${grupoId}&modelo=${modelo}`)
      .then(setData)
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setCargando(false));
  }, [alumnoId, grupoId, modelo]);

  // Merge series by fecha for chart
  const chartData = (() => {
    if (!data?.alumno.length) return [];
    const map: Record<string, Record<string, number>> = {};
    data.alumno.forEach(p => { map[p.fecha] = { ...map[p.fecha], alumno: p.valor }; });
    data.sp500.forEach(p => { map[p.fecha] = { ...map[p.fecha], sp500: p.valor }; });
    data.modelo.forEach(p => { map[p.fecha] = { ...map[p.fecha], modelo: p.valor }; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([fecha, vals]) => ({ fecha, ...vals }));
  })();

  const cols = [
    { key: "alumno", label: "Mi portafolio", color: "#f59e0b" },
    { key: "sp500", label: "S&P 500", color: "#60a5fa" },
    { key: "modelo", label: `Modelo ${modelo}`, color: "#a78bfa" },
  ];

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-fg">Comparador de Estrategias</h1>
            <p className="mt-1 font-mono text-sm text-fg/50">Compara tu rendimiento vs el mercado y portafolios modelo</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-fg/40">Modelo:</span>
            {MODELOS.map(m => (
              <button
                key={m.value}
                onClick={() => setModelo(m.value)}
                className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors ${modelo === m.value ? "bg-accent text-white" : "border border-fg/20 text-fg/60 hover:text-fg"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {!grupoId ? (
          <p className="border border-fg/10 bg-panel p-6 text-center font-mono text-sm text-fg/50">
            Selecciona un grupo desde Portafolio para ver la comparación.
          </p>
        ) : cargando ? (
          <div className="h-64 animate-pulse border border-fg/10 bg-panel" />
        ) : error ? (
          <p className="border border-perdida/30 bg-perdida/5 p-4 font-mono text-sm text-perdida">{error}</p>
        ) : data ? (
          <>
            {/* Chart */}
            <div className="mb-6 border border-fg/10 bg-panel p-4">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData}>
                  <XAxis dataKey="fecha" tick={{ fontFamily: "IBM Plex Mono", fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontFamily: "IBM Plex Mono", fontSize: 10 }} tickFormatter={v => `$${v.toFixed(0)}`} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-panel)", border: "1px solid rgba(var(--color-fg-rgb),0.15)", fontFamily: "IBM Plex Mono", fontSize: 11 }}
                    formatter={(v: number) => [`$${v.toFixed(2)}`]}
                  />
                  <Legend wrapperStyle={{ fontFamily: "IBM Plex Mono", fontSize: 11 }} />
                  {cols.map(c => (
                    <Line key={c.key} type="monotone" dataKey={c.key} name={c.label} stroke={c.color} dot={false} strokeWidth={1.5} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Metrics table */}
            <div className="grid grid-cols-3 gap-px bg-fg/10 border border-fg/10">
              {cols.map((c, ci) => {
                const m = data.metricas[c.key as keyof typeof data.metricas] as Metricas;
                return (
                  <div key={c.key} className="bg-panel p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: c.color }} />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-fg">{c.label}</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-fg/40">Rendimiento total</div>
                        <div className={`font-mono text-xl font-bold ${(m.rendimiento_total_pct ?? 0) >= 0 ? "text-ganancia" : "text-perdida"}`}>
                          {fmt(m.rendimiento_total_pct)}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center font-mono text-[10px] uppercase tracking-widest text-fg/40">
                          Volatilidad anualizada
                          <TooltipInfo texto="Mide qué tanto fluctúa el portafolio. Mayor volatilidad = mayor riesgo. Se expresa anualizado asumiendo 252 días de mercado." />
                        </div>
                        <div className="font-mono text-sm font-semibold text-fg">{fmt(m.volatilidad_anualizada)}</div>
                      </div>
                      <div>
                        <div className="flex items-center font-mono text-[10px] uppercase tracking-widest text-fg/40">
                          Sharpe Ratio
                          <TooltipInfo texto="Rendimiento obtenido por unidad de riesgo. &gt;1 = bueno, &gt;2 = excelente. Permite comparar carteras con distinto riesgo." />
                        </div>
                        <div className={`font-mono text-sm font-semibold ${sharpeColor(m.sharpe_ratio)}`}>
                          {m.sharpe_ratio != null ? m.sharpe_ratio.toFixed(2) : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
