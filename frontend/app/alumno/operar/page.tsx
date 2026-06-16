"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { api, ApiError } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";

interface PrecioResponse {
  ticker: string;
  precio: string;
}

interface Portafolio {
  grupo_id: string;
  capital_disponible: string;
}

interface OrdenResponse {
  id: string;
  ticker: string;
  tipo: "compra" | "venta";
  cantidad: string;
  precio_ejecucion: string;
}

export default function OperarPage() {
  const [ticker, setTicker] = useState("");
  const [precio, setPrecio] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const [buscando, setBuscando] = useState(false);
  const [operando, setOperando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function buscarPrecio(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setPrecio(null);
    setBuscando(true);
    try {
      const data = await api.get<PrecioResponse>(`/precios/${ticker.trim().toUpperCase()}`);
      setPrecio(data.precio);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo obtener el precio");
    } finally {
      setBuscando(false);
    }
  }

  async function ejecutarOrden(tipo: "compra" | "venta") {
    setError(null);
    setMensaje(null);

    const sesion = obtenerSesion();
    if (!sesion) {
      setError("Tu sesión expiró, vuelve a iniciar sesión");
      return;
    }
    const cantidadNum = Number(cantidad);
    if (!cantidadNum || cantidadNum <= 0) {
      setError("Ingresa una cantidad válida");
      return;
    }

    setOperando(true);
    try {
      const portafolio = await api.get<Portafolio>(`/alumnos/${sesion.userId}/portafolio`);
      const orden = await api.post<OrdenResponse>(`/ordenes/${tipo}`, {
        grupo_id: portafolio.grupo_id,
        ticker: ticker.trim().toUpperCase(),
        cantidad,
      });
      setMensaje(
        `${tipo === "compra" ? "Compra" : "Venta"} ejecutada: ${orden.cantidad} ${orden.ticker} a $${Number(
          orden.precio_ejecucion
        ).toFixed(2)}`
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo ejecutar la orden");
    } finally {
      setOperando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-lg p-6">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Operar</h1>

        <form onSubmit={buscarPrecio} className="mb-6 flex items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Ticker</label>
            <input
              required
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="AAPL"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={buscando}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {buscando ? "Buscando..." : "Buscar"}
          </button>
        </form>

        {precio && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">Precio actual de {ticker.toUpperCase()}</p>
            <p className="mb-4 text-3xl font-bold text-slate-900">${Number(precio).toFixed(2)}</p>

            <label className="mb-1 block text-sm font-medium text-slate-700">Cantidad</label>
            <input
              type="number"
              min="0.0001"
              step="0.0001"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />

            <p className="mb-4 text-sm text-slate-500">
              Total estimado: ${(Number(precio) * Number(cantidad || 0)).toFixed(2)}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => ejecutarOrden("compra")}
                disabled={operando}
                className="flex-1 rounded-md bg-ganancia px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Comprar
              </button>
              <button
                onClick={() => ejecutarOrden("venta")}
                disabled={operando}
                className="flex-1 rounded-md bg-perdida px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Vender
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {mensaje && <p className="text-sm text-ganancia">{mensaje}</p>}
      </div>
    </main>
  );
}
