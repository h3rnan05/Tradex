"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import PrecioChart from "@/components/PrecioChart";
import { Card } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";

interface PrecioResponse {
  ticker: string;
  precio: string;
}

interface HistorialResponse {
  ticker: string;
  historial: { fecha: string; precio: string }[];
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
  const [historial, setHistorial] = useState<{ fecha: string; precio: string }[]>([]);
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
    setHistorial([]);
    setBuscando(true);
    try {
      const tickerNormalizado = ticker.trim().toUpperCase();
      const [data, historialData] = await Promise.all([
        api.get<PrecioResponse>(`/precios/${tickerNormalizado}`),
        api.get<HistorialResponse>(`/precios/${tickerNormalizado}/historial?dias=30`).catch(() => null),
      ]);
      setPrecio(data.precio);
      if (historialData) setHistorial(historialData.historial);
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
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="mb-6 text-2xl font-bold text-ink">Operar</h1>

        <form onSubmit={buscarPrecio} className="mb-6 flex items-end gap-3 rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-ink/70">Ticker</label>
            <input
              required
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="AAPL"
              className="w-full rounded-md border border-ink/20 px-3 py-2 text-sm uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={buscando}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/80 disabled:opacity-50"
          >
            {buscando ? "Buscando..." : "Buscar"}
          </button>
        </form>

        {precio && (
          <Card className="mb-6">
            <p className="text-sm text-ink/40">Precio actual de {ticker.toUpperCase()}</p>
            <p className="mb-4 text-3xl font-bold text-ink">${Number(precio).toFixed(2)}</p>

            {historial.length > 0 && (
              <div className="mb-4">
                <PrecioChart historial={historial} />
              </div>
            )}

            <label className="mb-1 block text-sm font-medium text-ink/70">Cantidad</label>
            <input
              type="number"
              min="0.0001"
              step="0.0001"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="mb-4 w-full rounded-md border border-ink/20 px-3 py-2 text-sm"
            />

            <p className="mb-4 text-sm text-ink/40">
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
          </Card>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {mensaje && <p className="text-sm text-ganancia">{mensaje}</p>}
      </div>
    </main>
  );
}
