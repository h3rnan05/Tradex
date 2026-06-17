"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import Navbar from "@/components/Navbar";
import MercadosMundo from "@/components/MercadosMundo";
import PanelInsignias from "@/components/PanelInsignias";
import { Card, StatTile, formatoMoneda, formatoPorcentaje } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";

interface HoldingConPrecio {
  id: string;
  ticker: string;
  cantidad: string;
  precio_promedio: string;
  precio_actual: string;
  valor_mercado: string;
  pnl: string;
  pnl_porcentaje: string;
}

interface Portafolio {
  grupo_id: string;
  capital_disponible: string;
  capital_inicial: string;
  holdings: HoldingConPrecio[];
  valor_total: string;
  rendimiento: string;
  rendimiento_porcentaje: string;
}

interface Orden {
  id: string;
  ticker: string;
  tipo: "compra" | "venta";
  cantidad: string;
  precio_ejecucion: string;
  comision: string;
  timestamp: string;
}

interface PuntoValor {
  fecha: string;
  valor: number;
}

const COLORES_DONUT = ["#ff6600", "#0077b6", "#6d28d9", "#0096a0", "#cc5200", "#007a2e"];

export default function PortafolioPage() {
  const [portafolio, setPortafolio] = useState<Portafolio | null>(null);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [historialValor, setHistorialValor] = useState<PuntoValor[]>([]);
  const [cargandoGrafica, setCargandoGrafica] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insignias, setInsignias] = useState<{ codigo: string; otorgada_at: string }[]>([]);

  async function cargar() {
    const sesion = obtenerSesion();
    if (!sesion) return;
    try {
      const [data, ordenesData] = await Promise.all([
        api.get<Portafolio>(`/alumnos/${sesion.userId}/portafolio`),
        api.get<Orden[]>(`/alumnos/${sesion.userId}/ordenes`).catch(() => [] as Orden[]),
      ]);
      setPortafolio(data);
      setOrdenes(ordenesData);
      if (data.grupo_id) {
        localStorage.setItem("tradex_grupo_id", data.grupo_id);
        api.get<typeof insignias>(`/insignias/mis-insignias?grupo_id=${data.grupo_id}`).then(setInsignias).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar el portafolio");
    }
  }

  async function cargarHistorial() {
    const sesion = obtenerSesion();
    if (!sesion) return;
    setCargandoGrafica(true);
    try {
      const data = await api.get<PuntoValor[]>(`/alumnos/${sesion.userId}/historial-valor`);
      setHistorialValor(data);
    } catch {
      // silent — gráfica opcional
    } finally {
      setCargandoGrafica(false);
    }
  }

  useEffect(() => {
    cargar();
    cargarHistorial();
    const interval = setInterval(cargar, 10000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <main className="min-h-screen bg-canvas">
        <Navbar />
        <p className="p-6 text-sm text-perdida">{error}</p>
      </main>
    );
  }

  if (!portafolio) {
    return (
      <main className="min-h-screen bg-canvas">
        <Navbar />
        <p className="p-6 text-fg/40">Cargando...</p>
      </main>
    );
  }

  const distribucion = [
    { nombre: "Efectivo", valor: Number(portafolio.capital_disponible) },
    ...portafolio.holdings.map((h) => ({ nombre: h.ticker, valor: Number(h.valor_mercado) })),
  ].filter((d) => d.valor > 0);

  const ganadoras = [...portafolio.holdings]
    .filter((h) => Number(h.pnl) > 0)
    .sort((a, b) => Number(b.pnl_porcentaje) - Number(a.pnl_porcentaje));
  const perdedoras = [...portafolio.holdings]
    .filter((h) => Number(h.pnl) < 0)
    .sort((a, b) => Number(a.pnl_porcentaje) - Number(b.pnl_porcentaje));

  const capitalInicial = Number(portafolio.capital_inicial);
  const valorActual = Number(portafolio.valor_total);

  // Only show trading days (filter flat/weekend data) for the chart
  const datosGrafica = historialValor
    .filter((_, i, arr) => {
      if (i === 0) return true;
      return arr[i].valor !== arr[i - 1].valor;
    })
    .map((p) => ({
      fecha: new Date(p.fecha).toLocaleDateString("es-MX", { month: "short", day: "numeric" }),
      valor: p.valor,
    }));

  const graficaMin = datosGrafica.length > 0 ? Math.min(...datosGrafica.map((d) => d.valor)) * 0.998 : 0;
  const graficaMax = datosGrafica.length > 0 ? Math.max(...datosGrafica.map((d) => d.valor)) * 1.002 : 0;
  const graficaSubiendo =
    datosGrafica.length > 1
      ? datosGrafica[datosGrafica.length - 1].valor >= datosGrafica[0].valor
      : true;

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-7xl p-6">
        <h1 className="mb-6 text-2xl font-bold text-fg">Mi portafolio</h1>

        {/* KPIs */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Capital disponible" value={formatoMoneda(portafolio.capital_disponible)} />
          <StatTile label="Valor total del portafolio" value={formatoMoneda(portafolio.valor_total)} />
          <StatTile
            label="Rendimiento vs capital inicial"
            value={`${formatoMoneda(portafolio.rendimiento)} (${formatoPorcentaje(portafolio.rendimiento_porcentaje)})`}
            tone={Number(portafolio.rendimiento) >= 0 ? "ganancia" : "perdida"}
          />
        </div>

        {/* Gráfica de rendimiento */}
        {(datosGrafica.length > 1 || cargandoGrafica) && (
          <div className="mb-6">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">
              Rendimiento histórico
            </p>
            <Card className="p-4">
              {cargandoGrafica ? (
                <div className="flex h-40 items-center justify-center">
                  <p className="text-sm text-fg/40">Calculando rendimiento...</p>
                </div>
              ) : (
                <>
                  <div className="mb-2 flex items-baseline gap-3">
                    <span className="font-mono text-2xl font-bold tabular-nums text-fg">
                      {formatoMoneda(valorActual)}
                    </span>
                    <span className={`font-mono text-sm font-semibold ${graficaSubiendo ? "text-ganancia" : "text-perdida"}`}>
                      {graficaSubiendo ? "▲" : "▼"} {formatoMoneda(portafolio.rendimiento)} (
                      {formatoPorcentaje(portafolio.rendimiento_porcentaje)}) desde inicio
                    </span>
                  </div>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={datosGrafica} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis
                          dataKey="fecha"
                          tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }}
                          tickLine={false}
                          axisLine={false}
                          interval={Math.floor(datosGrafica.length / 6)}
                        />
                        <YAxis
                          domain={[graficaMin, graficaMax]}
                          tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                          width={48}
                        />
                        <Tooltip
                          formatter={(v: number) => [formatoMoneda(v), "Valor"]}
                          labelStyle={{ fontFamily: "IBM Plex Mono", fontSize: 11 }}
                          contentStyle={{ fontSize: 12, fontFamily: "IBM Plex Mono", border: "1px solid rgba(0,0,0,0.1)" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="valor"
                          stroke={graficaSubiendo ? "#16a34a" : "#dc2626"}
                          strokeWidth={1.5}
                          dot={false}
                          activeDot={{ r: 3 }}
                        />
                        {/* Capital inicial reference line */}
                        {capitalInicial > 0 && (
                          <Line
                            type="monotone"
                            dataKey={() => capitalInicial}
                            stroke="rgba(0,0,0,0.2)"
                            strokeWidth={1}
                            strokeDasharray="4 4"
                            dot={false}
                            legendType="none"
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-1 text-right font-mono text-[10px] text-fg/30">
                    Línea punteada = capital inicial ${capitalInicial.toLocaleString("en-US")}
                  </p>
                </>
              )}
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Columna izquierda-central: posiciones + órdenes recientes */}
          <div className="lg:col-span-8">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">Posiciones</p>
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-fg/5 text-left text-fg/60">
                  <tr>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider">Ticker</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider">Cantidad</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider">P. Promedio</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider">P. Actual</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider">Valor</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider">P&amp;L</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {portafolio.holdings.map((h) => (
                    <tr key={h.id} className="border-t border-fg/5 hover:bg-fg/5">
                      <td className="px-4 py-3 font-mono font-bold text-fg">{h.ticker}</td>
                      <td className="px-4 py-3 font-mono tabular-nums text-fg/70">{Number(h.cantidad).toFixed(4)}</td>
                      <td className="px-4 py-3 font-mono tabular-nums">{formatoMoneda(h.precio_promedio)}</td>
                      <td className="px-4 py-3 font-mono tabular-nums">{formatoMoneda(h.precio_actual)}</td>
                      <td className="px-4 py-3 font-mono tabular-nums">{formatoMoneda(h.valor_mercado)}</td>
                      <td
                        className={`px-4 py-3 font-mono font-medium tabular-nums ${
                          Number(h.pnl) >= 0 ? "text-ganancia" : "text-perdida"
                        }`}
                      >
                        {Number(h.pnl) >= 0 ? "▲" : "▼"} {formatoMoneda(h.pnl)}{" "}
                        <span className="text-xs">({Number(h.pnl_porcentaje).toFixed(2)}%)</span>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`/alumno/operar?t=${h.ticker}`}
                          className="rounded-none border border-fg/20 px-2 py-1 font-mono text-[11px] text-fg/60 hover:border-accent hover:text-accent"
                        >
                          Operar
                        </a>
                      </td>
                    </tr>
                  ))}
                  {portafolio.holdings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-sm text-fg/40">
                        Aún no tienes posiciones abiertas.{" "}
                        <a href="/alumno/operar" className="text-accent underline">
                          Ir a operar
                        </a>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>

            {/* Órdenes recientes */}
            {ordenes.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">
                  Órdenes recientes
                </p>
                <Card className="overflow-hidden p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-fg/5 text-left text-fg/60">
                      <tr>
                        <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider">Tipo</th>
                        <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider">Ticker</th>
                        <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider">Cantidad</th>
                        <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider">Precio</th>
                        <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider">Total</th>
                        <th className="px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordenes.slice(0, 10).map((o) => {
                        const esCompra = o.tipo === "compra";
                        const total = Number(o.precio_ejecucion) * Number(o.cantidad);
                        return (
                          <tr key={o.id} className="border-t border-fg/5">
                            <td className="px-4 py-2.5">
                              <span
                                className={`rounded-none px-2 py-0.5 font-mono text-[11px] font-semibold uppercase ${
                                  esCompra
                                    ? "bg-ganancia/10 text-ganancia"
                                    : "bg-perdida/10 text-perdida"
                                }`}
                              >
                                {o.tipo}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-mono font-bold text-fg">{o.ticker}</td>
                            <td className="px-4 py-2.5 font-mono tabular-nums text-fg/70">
                              {Number(o.cantidad).toFixed(4)}
                            </td>
                            <td className="px-4 py-2.5 font-mono tabular-nums">{formatoMoneda(o.precio_ejecucion)}</td>
                            <td className="px-4 py-2.5 font-mono tabular-nums">{formatoMoneda(total)}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-fg/50">
                              {new Date(o.timestamp).toLocaleDateString("es-MX", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              </div>
            )}

            {(ganadoras.length > 0 || perdedoras.length > 0) && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card>
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">
                    Mejores posiciones
                  </p>
                  {ganadoras.length === 0 ? (
                    <p className="text-sm text-fg/40">Sin posiciones en ganancia.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {ganadoras.slice(0, 3).map((h) => (
                        <li key={h.id} className="flex items-center justify-between text-sm">
                          <span className="font-mono font-bold text-fg">{h.ticker}</span>
                          <span className="font-mono tabular-nums text-ganancia">
                            +{Number(h.pnl_porcentaje).toFixed(2)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
                <Card>
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">
                    Peores posiciones
                  </p>
                  {perdedoras.length === 0 ? (
                    <p className="text-sm text-fg/40">Sin posiciones en pérdida.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {perdedoras.slice(0, 3).map((h) => (
                        <li key={h.id} className="flex items-center justify-between text-sm">
                          <span className="font-mono font-bold text-fg">{h.ticker}</span>
                          <span className="font-mono tabular-nums text-perdida">
                            {Number(h.pnl_porcentaje).toFixed(2)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            )}
          </div>

          {/* Columna derecha: distribución */}
          <div className="lg:col-span-4">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">Distribución</p>
            <Card>
              {distribucion.length === 0 ? (
                <p className="text-sm text-fg/40">Sin datos para mostrar.</p>
              ) : (
                <>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distribucion}
                          dataKey="valor"
                          nameKey="nombre"
                          innerRadius="60%"
                          outerRadius="90%"
                          paddingAngle={2}
                        >
                          {distribucion.map((_, i) => (
                            <Cell key={i} fill={COLORES_DONUT[i % COLORES_DONUT.length]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatoMoneda(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-2 flex flex-col gap-2">
                    {distribucion.map((d, i) => (
                      <li key={d.nombre} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block size-2.5"
                            style={{ backgroundColor: COLORES_DONUT[i % COLORES_DONUT.length] }}
                          />
                          <span className="font-mono font-medium text-fg">{d.nombre}</span>
                        </span>
                        <span className="font-mono tabular-nums text-fg/60">{formatoMoneda(d.valor)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>


            <div className="mt-4">
              <MercadosMundo compacto />
            </div>
          </div>
        </div>

        {/* Insignias */}
        <div className="mt-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">Mis Logros</p>
          <PanelInsignias insignias={insignias} />
        </div>
      </div>
    </main>
  );
}
