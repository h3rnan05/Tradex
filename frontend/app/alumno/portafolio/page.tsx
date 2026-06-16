"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
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

function formatoMoneda(valor: string | number) {
  return `$${Number(valor).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Mi portafolio</h1>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {!portafolio ? (
          <p className="text-slate-500">Cargando...</p>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Capital disponible</p>
                <p className="text-xl font-bold text-slate-900">{formatoMoneda(portafolio.capital_disponible)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Valor total del portafolio</p>
                <p className="text-xl font-bold text-slate-900">{formatoMoneda(portafolio.valor_total)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Rendimiento vs capital inicial</p>
                <p
                  className={`text-xl font-bold ${
                    Number(portafolio.rendimiento) >= 0 ? "text-ganancia" : "text-perdida"
                  }`}
                >
                  {formatoMoneda(portafolio.rendimiento)} ({Number(portafolio.rendimiento_porcentaje).toFixed(2)}%)
                </p>
              </div>
            </div>

            <h2 className="mb-3 text-lg font-semibold text-slate-900">Posiciones</h2>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Ticker</th>
                    <th className="px-4 py-3">Cantidad</th>
                    <th className="px-4 py-3">Precio promedio</th>
                    <th className="px-4 py-3">Precio actual</th>
                    <th className="px-4 py-3">P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {portafolio.holdings.map((h) => (
                    <tr key={h.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{h.ticker}</td>
                      <td className="px-4 py-3">{h.cantidad}</td>
                      <td className="px-4 py-3">{formatoMoneda(h.precio_promedio)}</td>
                      <td className="px-4 py-3">{formatoMoneda(h.precio_actual)}</td>
                      <td
                        className={`px-4 py-3 font-medium ${
                          Number(h.pnl) >= 0 ? "text-ganancia" : "text-perdida"
                        }`}
                      >
                        {formatoMoneda(h.pnl)} ({Number(h.pnl_porcentaje).toFixed(2)}%)
                      </td>
                    </tr>
                  ))}
                  {portafolio.holdings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-slate-500">
                        Aún no tienes posiciones abiertas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
