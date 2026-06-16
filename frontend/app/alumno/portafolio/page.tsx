"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import Navbar from "@/components/Navbar";
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

const COLORES_DONUT = ["#ff6600", "#0077b6", "#6d28d9", "#0096a0", "#cc5200", "#007a2e"];

export default function PortafolioPage() {
  const [portafolio, setPortafolio] = useState<Portafolio | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    const sesion = obtenerSesion();
    if (!sesion) return;
    try {
      const data = await api.get<Portafolio>(`/alumnos/${sesion.userId}/portafolio`);
      setPortafolio(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar el portafolio");
    }
  }

  useEffect(() => {
    cargar();
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

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-7xl p-6">
        <h1 className="mb-6 text-2xl font-bold text-fg">Mi portafolio</h1>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Capital disponible" value={formatoMoneda(portafolio.capital_disponible)} />
          <StatTile label="Valor total del portafolio" value={formatoMoneda(portafolio.valor_total)} />
          <StatTile
            label="Rendimiento vs capital inicial"
            value={`${formatoMoneda(portafolio.rendimiento)} (${formatoPorcentaje(portafolio.rendimiento_porcentaje)})`}
            tone={Number(portafolio.rendimiento) >= 0 ? "ganancia" : "perdida"}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Columna central-izquierda: posiciones */}
          <div className="lg:col-span-8">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">Posiciones</p>
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-fg/5 text-left text-fg/60">
                  <tr>
                    <th className="px-4 py-3">Ticker</th>
                    <th className="px-4 py-3">Cantidad</th>
                    <th className="px-4 py-3">Precio promedio</th>
                    <th className="px-4 py-3">Precio actual</th>
                    <th className="px-4 py-3">Valor de mercado</th>
                    <th className="px-4 py-3">P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {portafolio.holdings.map((h) => (
                    <tr key={h.id} className="border-t border-fg/5">
                      <td className="px-4 py-3 font-mono font-bold text-fg">{h.ticker}</td>
                      <td className="px-4 py-3 font-mono tabular-nums">{h.cantidad}</td>
                      <td className="px-4 py-3 font-mono tabular-nums">{formatoMoneda(h.precio_promedio)}</td>
                      <td className="px-4 py-3 font-mono tabular-nums">{formatoMoneda(h.precio_actual)}</td>
                      <td className="px-4 py-3 font-mono tabular-nums">{formatoMoneda(h.valor_mercado)}</td>
                      <td
                        className={`px-4 py-3 font-mono font-medium tabular-nums ${
                          Number(h.pnl) >= 0 ? "text-ganancia" : "text-perdida"
                        }`}
                      >
                        {Number(h.pnl) >= 0 ? "▲" : "▼"} {formatoMoneda(h.pnl)} (
                        {Number(h.pnl_porcentaje).toFixed(2)}%)
                      </td>
                    </tr>
                  ))}
                  {portafolio.holdings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-fg/40">
                        Aún no tienes posiciones abiertas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>

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

          {/* Columna derecha: distribución del portafolio */}
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
          </div>
        </div>
      </div>
    </main>
  );
}
