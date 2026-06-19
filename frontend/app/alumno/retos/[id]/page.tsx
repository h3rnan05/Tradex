"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Badge, Card, StatTile, formatoMoneda, formatoPorcentaje } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface RetoOut {
  id: string;
  grupo_id: string;
  escenario_id: string;
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
  tickers_sugeridos: string[];
}

interface RankingEntry {
  alumno_id: string;
  nombre: string;
  valor_total: string;
  rendimiento_porcentaje: string;
}

export default function RetoTradingPage() {
  const { t } = useLanguage();
  const params = useParams<{ id: string }>();
  const [estado, setEstado] = useState<RetoEstado | null>(null);
  const [escenario, setEscenario] = useState<Escenario | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [ticker, setTicker] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [operando, setOperando] = useState(false);

  async function cargarEstado() {
    try {
      const data = await api.get<RetoEstado>(`/retos/${params.id}/estado`);
      setEstado(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("challenge.errorLoad"));
    }
  }

  async function cargarRanking() {
    try {
      const data = await api.get<RankingEntry[]>(`/retos/${params.id}/ranking`);
      setRanking(data);
    } catch {
      // no critico
    }
  }

  useEffect(() => {
    cargarEstado();
    cargarRanking();
    const interval = setInterval(() => {
      cargarEstado();
      cargarRanking();
    }, 5000);
    return () => clearInterval(interval);
  }, [params.id]);

  useEffect(() => {
    if (!estado) return;
    api
      .get<Escenario[]>("/precios/escenarios")
      .then((lista) => setEscenario(lista.find((e) => e.id === estado.reto.escenario_id) ?? null))
      .catch(() => {});
  }, [estado?.reto.escenario_id]);

  async function operar(tipo: "comprar" | "vender") {
    if (!ticker) return;
    setError(null);
    setMensaje(null);
    setOperando(true);
    try {
      await api.post(`/retos/${params.id}/${tipo}`, { ticker, cantidad });
      setMensaje(tipo === "comprar" ? t("challenge.buyDone") : t("challenge.sellDone"));
      await cargarEstado();
      await cargarRanking();
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

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="mb-1 text-2xl font-bold text-fg">{estado.reto.nombre}</h1>
        <p className="mb-6 text-sm text-fg/40">
          {t("challenge.scenario")}: {escenario?.nombre ?? estado.reto.escenario_id}
          {" · "}
          {terminado ? t("challenge.finished") : `${t("challenge.progress")}: ${estado.progreso_porcentaje.toFixed(0)}%`}
        </p>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label={t("challenge.availableCapital")} value={formatoMoneda(estado.capital_disponible)} />
          <StatTile label={t("challenge.totalValue")} value={formatoMoneda(estado.valor_total)} />
          <StatTile
            label={t("challenge.return")}
            value={formatoPorcentaje(estado.rendimiento_porcentaje)}
            tone={Number(estado.rendimiento_porcentaje) >= 0 ? "ganancia" : "perdida"}
          />
        </div>

        {!terminado && escenario && (
          <Card className="mb-6">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">{t("challenge.trade")}</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {escenario.tickers_sugeridos.map((tk) => (
                <button
                  key={tk}
                  onClick={() => setTicker(tk)}
                  className={`rounded-none px-3 py-1 font-mono text-xs uppercase tracking-wide ${
                    ticker === tk ? "bg-accent text-white" : "bg-fg/5 text-fg/70 hover:bg-fg/10"
                  }`}
                >
                  {tk}
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
                    className="w-32 rounded-none border border-fg/20 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={() => operar("comprar")}
                  disabled={operando}
                  className="rounded-none bg-ganancia px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {t("challenge.buy")}
                </button>
                <button
                  onClick={() => operar("vender")}
                  disabled={operando}
                  className="rounded-none bg-perdida px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {t("challenge.sell")}
                </button>
              </div>
            )}
            {error && <p className="mt-3 text-sm text-perdida">{error}</p>}
            {mensaje && <p className="mt-3 text-sm text-ganancia">{mensaje}</p>}
          </Card>
        )}

        {estado.holdings.length > 0 && (
          <Card className="mb-6 overflow-hidden p-0">
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
                    <td className="px-4 py-3 font-medium text-fg">{h.ticker}</td>
                    <td className="px-4 py-3">{h.cantidad}</td>
                    <td className="px-4 py-3">{formatoMoneda(h.precio_promedio)}</td>
                    <td className="px-4 py-3">{formatoMoneda(h.precio_actual)}</td>
                    <td className="px-4 py-3">{formatoMoneda(h.valor_mercado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <h2 className="mb-3 text-lg font-semibold text-fg">{t("challenge.ranking")}</h2>
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-fg/5 text-left text-fg/60">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{t("challenge.student")}</th>
                <th className="px-4 py-3">{t("challenge.totalValue")}</th>
                <th className="px-4 py-3">{t("challenge.return")}</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.alumno_id} className="border-t border-fg/5">
                  <td className="px-4 py-3 text-fg/40">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-fg">{r.nombre}</td>
                  <td className="px-4 py-3">{formatoMoneda(r.valor_total)}</td>
                  <td className="px-4 py-3">
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
    </main>
  );
}
