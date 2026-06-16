"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Badge, Card, formatoMoneda } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";

interface Orden {
  id: string;
  ticker: string;
  tipo: "compra" | "venta";
  cantidad: string;
  precio_ejecucion: string;
  timestamp: string;
}

export default function HistorialPage() {
  const [ordenes, setOrdenes] = useState<Orden[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion) return;
    api
      .get<Orden[]>(`/alumnos/${sesion.userId}/ordenes`)
      .then(setOrdenes)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error al cargar el historial"));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Historial de órdenes</h1>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {!ordenes ? (
          <p className="text-slate-500">Cargando...</p>
        ) : ordenes.length === 0 ? (
          <Card>
            <p className="text-slate-500">Aún no has realizado ninguna operación.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Ticker</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Precio de ejecución</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((o) => (
                  <tr key={o.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(o.timestamp).toLocaleString("es-MX")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={o.tipo === "compra" ? "ganancia" : "perdida"}>
                        {o.tipo === "compra" ? "Compra" : "Venta"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{o.ticker}</td>
                    <td className="px-4 py-3">{o.cantidad}</td>
                    <td className="px-4 py-3">{formatoMoneda(o.precio_ejecucion)}</td>
                    <td className="px-4 py-3">{formatoMoneda(Number(o.cantidad) * Number(o.precio_ejecucion))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </main>
  );
}
