"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Tooltip from "@/components/Tooltip";
import { api } from "@/lib/api";

interface Sector {
  sector: string;
  cambio_porcentaje: number | null;
}

interface ScreenerItem {
  symbol: string;
  shortName: string | null;
  precio: number | null;
  cambio_porcentaje: number | null;
  volumen: number | null;
  market_cap: number | null;
}

interface EarningsItem {
  fecha: string;
  ticker: string | null;
  empresa: string | null;
  momento: string;
  eps_estimado: number | null;
  eps_actual: number | null;
}

type ScreenerTipo = "most_actives" | "day_gainers" | "day_losers";

const SCREENER_TABS: { key: ScreenerTipo; label: string }[] = [
  { key: "most_actives", label: "Más activos" },
  { key: "day_gainers", label: "Mayores subidas" },
  { key: "day_losers", label: "Mayores bajadas" },
];

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  const s = v >= 0 ? "+" : "";
  return `${s}${v.toFixed(2)}%`;
}

function fmtNum(v: number | null): string {
  if (v == null) return "—";
  return `$${v.toFixed(2)}`;
}

function fmtVolumen(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

function fmtCap(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1_000_000_000_000) return `$${(v / 1_000_000_000_000).toFixed(2)}T`;
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  return `$${v.toLocaleString()}`;
}

function sectorBg(pct: number | null): string {
  if (pct == null) return "bg-fg/10";
  if (pct >= 3) return "bg-[#0a5c2e]";
  if (pct >= 1.5) return "bg-[#0d7a3c]";
  if (pct >= 0.5) return "bg-[#1a9950]";
  if (pct > 0) return "bg-[#2db86a]";
  if (pct === 0) return "bg-fg/10";
  if (pct > -0.5) return "bg-[#c0392b]";
  if (pct > -1.5) return "bg-[#a93226]";
  if (pct > -3) return "bg-[#8e1f1a]";
  return "bg-[#6b1212]";
}

function sectorSize(pct: number | null): string {
  const abs = Math.abs(pct ?? 0);
  if (abs >= 3) return "py-8 text-base";
  if (abs >= 1.5) return "py-6 text-sm";
  if (abs >= 0.5) return "py-5 text-sm";
  return "py-4 text-xs";
}

export default function MercadosPage() {
  const router = useRouter();

  const [sectores, setSectores] = useState<Sector[]>([]);
  const [screener, setScreener] = useState<ScreenerItem[]>([]);
  const [screenerTab, setScreenerTab] = useState<ScreenerTipo>("most_actives");
  const [earnings, setEarnings] = useState<EarningsItem[]>([]);
  const [cargandoSectores, setCargandoSectores] = useState(true);
  const [cargandoScreener, setCargandoScreener] = useState(true);
  const [cargandoEarnings, setCargandoEarnings] = useState(true);

  useEffect(() => {
    api
      .get<Sector[]>("/precios/sectores")
      .then(setSectores)
      .catch(() => {})
      .finally(() => setCargandoSectores(false));

    api
      .get<EarningsItem[]>("/precios/earnings-calendar")
      .then(setEarnings)
      .catch(() => {})
      .finally(() => setCargandoEarnings(false));
  }, []);

  useEffect(() => {
    setCargandoScreener(true);
    api
      .get<ScreenerItem[]>(`/precios/screener?tipo=${screenerTab}`)
      .then(setScreener)
      .catch(() => setScreener([]))
      .finally(() => setCargandoScreener(false));
  }, [screenerTab]);

  // Group earnings by date
  const earningsByFecha: Record<string, EarningsItem[]> = {};
  for (const e of earnings) {
    if (!earningsByFecha[e.fecha]) earningsByFecha[e.fecha] = [];
    earningsByFecha[e.fecha].push(e);
  }
  const fechasOrdenadas = Object.keys(earningsByFecha).sort();

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-7xl p-6">
        <h1 className="mb-6 text-2xl font-bold text-fg">Mercados</h1>

        {/* ── Sector Heatmap ── */}
        <section className="mb-8">
          <p className="mb-3 flex items-center font-mono text-[11px] uppercase tracking-widest text-fg/40">
            Distribución por Sector
            <Tooltip texto="Muestra el rendimiento de cada sector del mercado hoy. Útil para identificar qué industrias están liderando o rezagadas." />
          </p>
          {cargandoSectores ? (
            <p className="border border-fg/10 bg-panel p-4 text-sm text-fg/40">Cargando sectores...</p>
          ) : sectores.length === 0 ? (
            <p className="border border-fg/10 bg-panel p-4 text-sm text-fg/40">No se pudieron cargar los sectores.</p>
          ) : (
            <div className="grid grid-cols-3 gap-px bg-fg/10 border border-fg/10 sm:grid-cols-4 lg:grid-cols-6" style={{gridAutoRows: "1fr"}}>
              {sectores.map((s) => (
                <div
                  key={s.sector}
                  className={`flex flex-col items-center justify-center px-2 text-center text-white cursor-default select-none ${sectorBg(s.cambio_porcentaje)} ${sectorSize(s.cambio_porcentaje)}`}
                >
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wide leading-tight opacity-90">{s.sector}</span>
                  <span className="mt-1 font-mono font-bold tabular-nums">
                    {fmtPct(s.cambio_porcentaje)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Screener ── */}
        <section className="mb-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">Screener</p>

          {/* Tabs */}
          <div className="mb-3 flex border-b border-fg/10">
            {SCREENER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setScreenerTab(tab.key)}
                className={`px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                  screenerTab === tab.key
                    ? "border-b-2 border-accent text-accent"
                    : "text-fg/50 hover:text-fg"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {cargandoScreener ? (
            <p className="rounded-none border border-fg/10 bg-panel p-4 text-sm text-fg/40">Cargando...</p>
          ) : screener.length === 0 ? (
            <p className="rounded-none border border-fg/10 bg-panel p-4 text-sm text-fg/40">Sin datos disponibles.</p>
          ) : (
            <div className="overflow-x-auto rounded-none border border-fg/10 bg-panel">
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr className="border-b border-fg/10 text-[10px] uppercase tracking-wider text-fg/40">
                    <th className="px-3 py-2 text-left">Ticker</th>
                    <th className="px-3 py-2 text-left">Empresa</th>
                    <th className="px-3 py-2 text-right">Precio</th>
                    <th className="px-3 py-2 text-right">Cambio %</th>
                    <th className="px-3 py-2 text-right">
                      <span className="inline-flex items-center">
                        Volumen
                        <Tooltip texto="Número de acciones negociadas hoy. Volumen alto = mucho interés del mercado." />
                      </span>
                    </th>
                    <th className="px-3 py-2 text-right">
                      <span className="inline-flex items-center">
                        Cap. Mkt
                        <Tooltip texto="Valor total de la empresa en el mercado (precio × acciones en circulación)." />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {screener.map((item) => {
                    const sube = (item.cambio_porcentaje ?? 0) >= 0;
                    return (
                      <tr
                        key={item.symbol}
                        onClick={() => router.push(`/alumno/operar?t=${encodeURIComponent(item.symbol)}`)}
                        className="cursor-pointer border-b border-fg/5 last:border-0 hover:bg-fg/5"
                      >
                        <td className="px-3 py-2 font-bold text-fg">{item.symbol}</td>
                        <td className="max-w-[180px] truncate px-3 py-2 text-fg/60">{item.shortName ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-fg">{fmtNum(item.precio)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums font-semibold ${sube ? "text-ganancia" : "text-perdida"}`}>
                          {fmtPct(item.cambio_porcentaje)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-fg/70">{fmtVolumen(item.volumen)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-fg/70">{fmtCap(item.market_cap)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Earnings Calendar ── */}
        <section>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">Calendario de Resultados</p>
          {cargandoEarnings ? (
            <p className="rounded-none border border-fg/10 bg-panel p-4 text-sm text-fg/40">Cargando calendario...</p>
          ) : fechasOrdenadas.length === 0 ? (
            <p className="rounded-none border border-fg/10 bg-panel p-4 text-sm text-fg/40">Sin resultados próximos disponibles.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {fechasOrdenadas.map((fecha) => (
                <div key={fecha} className="rounded-none border border-fg/10 bg-panel">
                  <div className="border-b border-fg/10 bg-canvas px-4 py-2">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-fg/60">
                      {new Date(fecha + "T12:00:00Z").toLocaleDateString("es-MX", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full font-mono text-sm">
                      <thead>
                        <tr className="border-b border-fg/5 text-[10px] uppercase tracking-wider text-fg/40">
                          <th className="px-3 py-2 text-left">Empresa</th>
                          <th className="px-3 py-2 text-left">Ticker</th>
                          <th className="px-3 py-2 text-left">Momento</th>
                          <th className="px-3 py-2 text-right">
                            <span className="inline-flex items-center">
                              EPS Est.
                              <Tooltip texto="Earnings Per Share: ganancia por acción reportada por la empresa. Si supera el estimado, generalmente sube el precio." />
                            </span>
                          </th>
                          <th className="px-3 py-2 text-right">EPS Real</th>
                        </tr>
                      </thead>
                      <tbody>
                        {earningsByFecha[fecha].map((e, i) => {
                          const supero =
                            e.eps_actual != null &&
                            e.eps_estimado != null &&
                            e.eps_actual > e.eps_estimado;
                          const quedo =
                            e.eps_actual != null &&
                            e.eps_estimado != null &&
                            e.eps_actual < e.eps_estimado;
                          return (
                            <tr key={i} className="border-b border-fg/5 last:border-0 hover:bg-fg/5">
                              <td className="max-w-[200px] truncate px-3 py-2 text-fg/70">{e.empresa ?? "—"}</td>
                              <td className="px-3 py-2 font-bold text-fg">{e.ticker ?? "—"}</td>
                              <td className="px-3 py-2 text-fg/60">{e.momento}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-fg/70">
                                {e.eps_estimado != null ? `$${e.eps_estimado.toFixed(2)}` : "—"}
                              </td>
                              <td className={`px-3 py-2 text-right tabular-nums font-semibold ${supero ? "text-ganancia" : quedo ? "text-perdida" : "text-fg/70"}`}>
                                {e.eps_actual != null ? `$${e.eps_actual.toFixed(2)}` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
