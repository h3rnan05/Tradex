"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Badge, Card, StatTile, formatoMoneda, formatoPorcentaje } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface RetoOut {
  id: string;
  grupo_id: string;
  escenario_id: string | null;
  activos_permitidos: string[] | null;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  capital_inicial: string;
}

interface RetoHolding {
  ticker: string;
  cantidad: string;
  precio_promedio: string;
  precio_actual: string;
  valor_mercado: string;
}

interface RetoEstado {
  reto: RetoOut;
  capital_disponible: string;
  holdings: RetoHolding[];
  valor_total: string;
  rendimiento_porcentaje: string;
  progreso_porcentaje: number;
}

interface Escenario {
  id: string;
  nombre: string;
  descripcion: string;
  tickers_sugeridos: string[];
}

interface RankingEntry {
  alumno_id: string;
  nombre: string;
  valor_total: string;
  rendimiento_porcentaje: string;
}

interface RetoOrden {
  id: string;
  ticker: string;
  tipo: "compra" | "venta";
  cantidad: string;
  precio_ejecucion: string;
  timestamp: string;
}

function limpiar(t: string) {
  return t.replace("-USD", "").replace("=X", "").replace(".MX", "");
}

/**
 * Interfaz inmersiva del reto: cuando hay un reto activo, las pantallas
 * principales del alumno (operar, portafolio, ranking) muestran esto en su
 * lugar — todo gira alrededor del reto.
 */
export default function RetoActivo({ retoId }: { retoId: string }) {
  const { t } = useLanguage();
  const [estado, setEstado] = useState<RetoEstado | null>(null);
  const [escenario, setEscenario] = useState<Escenario | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [ordenes, setOrdenes] = useState<RetoOrden[]>([]);
  const [ticker, setTicker] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [operando, setOperando] = useState(false);

  async function cargarEstado() {
    try {
      setEstado(await api.get<RetoEstado>(`/retos/${retoId}/estado`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("challenge.errorLoad"));
    }
  }
  function cargarRanking() {
    api.get<RankingEntry[]>(`/retos/${retoId}/ranking`).then(setRanking).catch(() => {});
  }
  function cargarOrdenes() {
    api.get<RetoOrden[]>(`/retos/${retoId}/ordenes`).then(setOrdenes).catch(() => {});
  }

  useEffect(() => {
    cargarEstado();
    cargarRanking();
    cargarOrdenes();
    const interval = setInterval(() => {
      cargarEstado();
      cargarRanking();
    }, 5000);
    return () => clearInterval(interval);
  }, [retoId]);

  useEffect(() => {
    if (!estado?.reto.escenario_id) return;
    api
      .get<Escenario[]>("/precios/escenarios")
      .then((lista) => setEscenario(lista.find((e) => e.id === estado.reto.escenario_id) ?? null))
      .catch(() => {});
  }, [estado?.reto.escenario_id]);

  const activosReto = estado?.reto.activos_permitidos ?? [];
  const tickersOperables = activosReto.length > 0 ? activosReto : escenario?.tickers_sugeridos ?? [];

  async function operar(tipo: "comprar" | "vender") {
    if (!ticker) return;
    setError(null);
    setMensaje(null);
    setOperando(true);
    try {
      await api.post(`/retos/${retoId}/${tipo}`, { ticker, cantidad });
      setMensaje(tipo === "comprar" ? t("challenge.buyDone") : t("challenge.sellDone"));
      await cargarEstado();
      cargarRanking();
      cargarOrdenes();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("challenge.errorOrder"));
    } finally {
      setOperando(false);
    }
  }

  if (!estado) {
    return (
      <main className="min-h-screen bg-canvas">
        <Navbar />
        <p className="p-6 text-fg/40">{t("challenge.loading")}</p>
      </main>
    );
  }

  const terminado = estado.progreso_porcentaje >= 100;
  const fin = new Date(estado.reto.fecha_fin).getTime();
  const restanteMs = fin - Date.now();
  const horas = Math.max(0, Math.floor(restanteMs / 3_600_000));
  const dias = Math.floor(horas / 24);
  const restante = dias >= 1 ? `${dias}d ${horas % 24}h` : `${horas}h ${Math.max(0, Math.floor((restanteMs % 3_600_000) / 60000))}m`;

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        {/* Encabezado del reto */}
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-accent">● {t("retoMode.live")}</span>
          <h1 className="text-2xl font-bold text-fg">{estado.reto.nombre}</h1>
          <Badge tone={terminado ? "perdida" : "ganancia"}>
            {terminado ? t("challenge.finished") : `${t("retoMode.ends")} ${restante}`}
          </Badge>
        </div>
        <p className="mb-4 text-sm text-fg/50">
          {activosReto.length > 0
            ? `${t("challenges.assets")}: ${activosReto.map(limpiar).join(", ")}`
            : escenario
            ? `${t("challenge.scenario")}: ${escenario.nombre} — ${escenario.descripcion}`
            : ""}
        </p>

        {/* Barra de progreso */}
        <div className="mb-6 h-1.5 w-full bg-fg/10">
          <div className="h-full bg-accent transition-all" style={{ width: `${estado.progreso_porcentaje}%` }} />
        </div>

        {/* KPIs */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label={t("challenge.availableCapital")} value={formatoMoneda(estado.capital_disponible)} />
          <StatTile label={t("challenge.totalValue")} value={formatoMoneda(estado.valor_total)} />
          <StatTile
            label={t("challenge.return")}
            value={formatoPorcentaje(estado.rendimiento_porcentaje)}
            tone={Number(estado.rendimiento_porcentaje) >= 0 ? "ganancia" : "perdida"}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {/* Panel de trading */}
            {!terminado && tickersOperables.length > 0 && (
              <Card className="mb-4">
                <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">{t("challenge.trade")}</p>
                <div className="mb-3 flex flex-wrap gap-2">
                  {tickersOperables.map((tk) => (
                    <button
                      key={tk}
                      onClick={() => setTicker(tk)}
                      className={`rounded-none px-3 py-1 font-mono text-xs uppercase tracking-wide ${
                        ticker === tk ? "bg-accent text-black" : "bg-fg/5 text-fg/70 hover:bg-fg/10"
                      }`}
                    >
                      {limpiar(tk)}
                    </button>
                  ))}
                </div>
                {ticker && (
                  <div className="flex items-end gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-fg/70">{t("challenge.quantity")}</label>
                      <input
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={cantidad}
                        onChange={(e) => setCantidad(e.target.value)}
                        className="w-32 rounded-none border border-fg/20 bg-canvas px-3 py-2 text-sm"
                      />
                    </div>
                    <button onClick={() => operar("comprar")} disabled={operando} className="rounded-none bg-ganancia px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                      {t("challenge.buy")}
                    </button>
                    <button onClick={() => operar("vender")} disabled={operando} className="rounded-none bg-perdida px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                      {t("challenge.sell")}
                    </button>
                  </div>
                )}
                {error && <p className="mt-3 text-sm text-perdida">{error}</p>}
                {mensaje && <p className="mt-3 text-sm text-ganancia">{mensaje}</p>}
              </Card>
            )}

            {/* Posiciones */}
            {estado.holdings.length > 0 && (
              <Card className="mb-4 overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead className="bg-fg/5 text-left text-fg/60">
                    <tr>
                      <th className="px-4 py-3">{t("challenge.ticker")}</th>
                      <th className="px-4 py-3">{t("challenge.quantity")}</th>
                      <th className="px-4 py-3">{t("challenge.avgPrice")}</th>
                      <th className="px-4 py-3">{t("challenge.currentPrice")}</th>
                      <th className="px-4 py-3">{t("challenge.marketValue")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estado.holdings.map((h) => (
                      <tr key={h.ticker} className="border-t border-fg/5">
                        <td className="px-4 py-3 font-medium text-fg">{limpiar(h.ticker)}</td>
                        <td className="px-4 py-3">{Number(h.cantidad).toFixed(4)}</td>
                        <td className="px-4 py-3">{formatoMoneda(h.precio_promedio)}</td>
                        <td className="px-4 py-3">{formatoMoneda(h.precio_actual)}</td>
                        <td className="px-4 py-3">{formatoMoneda(h.valor_mercado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}

            {/* Órdenes recientes */}
            {ordenes.length > 0 && (
              <Card className="overflow-hidden p-0">
                <p className="border-b border-fg/5 px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">{t("history.title")}</p>
                <table className="w-full text-sm">
                  <tbody>
                    {ordenes.slice(0, 8).map((o) => (
                      <tr key={o.id} className="border-t border-fg/5">
                        <td className="px-4 py-2.5">
                          <span className={`rounded-none px-2 py-0.5 font-mono text-[11px] font-semibold uppercase ${o.tipo === "compra" ? "bg-ganancia/10 text-ganancia" : "bg-perdida/10 text-perdida"}`}>{o.tipo}</span>
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-fg">{limpiar(o.ticker)}</td>
                        <td className="px-4 py-2.5 font-mono tabular-nums text-fg/70">{Number(o.cantidad).toFixed(4)}</td>
                        <td className="px-4 py-2.5 font-mono tabular-nums">{formatoMoneda(o.precio_ejecucion)}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-fg/50">
                          {new Date(o.timestamp).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>

          {/* Ranking */}
          <div className="lg:col-span-4">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">{t("challenge.ranking")}</p>
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <tbody>
                  {ranking.map((r, i) => (
                    <tr key={r.alumno_id} className="border-t border-fg/5 first:border-t-0">
                      <td className="px-3 py-2.5 text-fg/40">{terminado && i === 0 ? "🏅" : i + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-fg">{r.nombre}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatoMoneda(r.valor_total)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <Badge tone={Number(r.rendimiento_porcentaje) >= 0 ? "ganancia" : "perdida"}>
                          {formatoPorcentaje(r.rendimiento_porcentaje)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {ranking.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center font-mono text-sm text-fg/30">{t("challenge.noParticipants")}</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
