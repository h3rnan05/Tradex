"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Badge, Card, StatTile, formatoMoneda, formatoPorcentaje } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";

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
      setError(err instanceof ApiError ? err.message : "Error al cargar el reto");
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
      setMensaje(`${tipo === "comprar" ? "Compra" : "Venta"} ejecutada`);
      await cargarEstado();
      await cargarRanking();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo ejecutar la orden");
    } finally {
      setOperando(false);
    }
  }

  if (!estado) {
    return (
      <main className="min-h-screen bg-canvas">
        <Navbar />
        <p className="p-6 text-fg/40">Cargando...</p>
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
          Escenario: {escenario?.nombre ?? estado.reto.escenario_id}
          {" · "}
          {terminado ? "Reto finalizado" : `Progreso: ${estado.progreso_porcentaje.toFixed(0)}%`}
        </p>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Capital disponible" value={formatoMoneda(estado.capital_disponible)} />
          <StatTile label="Valor total" value={formatoMoneda(estado.valor_total)} />
          <StatTile
            label="Rendimiento"
            value={formatoPorcentaje(estado.rendimiento_porcentaje)}
            tone={Number(estado.rendimiento_porcentaje) >= 0 ? "ganancia" : "perdida"}
          />
        </div>

        {!terminado && escenario && (
          <Card className="mb-6">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">Operar</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {escenario.tickers_sugeridos.map((t) => (
                <button
                  key={t}
                  onClick={() => setTicker(t)}
                  className={`rounded-none px-3 py-1 font-mono text-xs uppercase tracking-wide ${
                    ticker === t ? "bg-accent text-white" : "bg-fg/5 text-fg/70 hover:bg-fg/10"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {ticker && (
              <div className="flex items-end gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-fg/70">Cantidad</label>
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
                  Comprar
                </button>
                <button
                  onClick={() => operar("vender")}
                  disabled={operando}
                  className="rounded-none bg-perdida px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  Vender
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
                  <th className="px-4 py-3">Ticker</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Precio promedio</th>
                  <th className="px-4 py-3">Precio actual</th>
                  <th className="px-4 py-3">Valor de mercado</th>
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

        <h2 className="mb-3 text-lg font-semibold text-fg">Ranking del reto</h2>
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-fg/5 text-left text-fg/60">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Alumno</th>
                <th className="px-4 py-3">Valor total</th>
                <th className="px-4 py-3">Rendimiento</th>
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
            </tbody>
          </table>
        </Card>
      </div>
    </main>
  );
}
