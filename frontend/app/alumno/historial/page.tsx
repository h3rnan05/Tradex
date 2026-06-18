"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ComentariosMaestro from "@/components/ComentariosMaestro";
import { Badge, Card, formatoMoneda } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";

interface Orden {
  id: string;
  ticker: string;
  tipo: "compra" | "venta";
  cantidad: string;
  precio_ejecucion: string;
  comision: string;
  timestamp: string;
}

export default function HistorialPage() {
  const [ordenes, setOrdenes] = useState<Orden[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion) return;
    api
      .get<Orden[]>(`/alumnos/${sesion.userId}/ordenes`)
      .then(setOrdenes)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error al cargar el historial"));
  }, []);

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <h1 className="mb-6 text-2xl font-bold text-fg">Historial de órdenes</h1>

        {error && <p className="mb-4 text-sm text-perdida">{error}</p>}

        {!ordenes ? (
          <p className="text-fg/40">Cargando...</p>
        ) : ordenes.length === 0 ? (
          <Card>
            <p className="text-fg/40">Aún no has realizado ninguna operación.</p>
          </Card>
        ) : (
          <div className="space-y-px border border-fg/10">
            {ordenes.map((o) => (
              <div key={o.id} className="border-b border-fg/5 bg-panel last:border-0">
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-fg/5"
                  onClick={() => setExpandido(expandido === o.id ? null : o.id)}
                >
                  <span className="w-32 shrink-0 font-mono text-[10px] text-fg/40">
                    {new Date(o.timestamp).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <Badge tone={o.tipo === "compra" ? "ganancia" : "perdida"}>
                    {o.tipo === "compra" ? "Compra" : "Venta"}
                  </Badge>
                  <span className="w-16 font-mono text-sm font-bold text-fg">{o.ticker}</span>
                  <span className="font-mono text-xs text-fg/60">{o.cantidad} acc. × {formatoMoneda(o.precio_ejecucion)}</span>
                  <span className="ml-auto font-mono text-sm font-bold text-fg">
                    {formatoMoneda(Number(o.cantidad) * Number(o.precio_ejecucion))}
                  </span>
                  <span className="font-mono text-[10px] text-fg/30">{expandido === o.id ? "▲" : "▼"}</span>
                </div>
                {expandido === o.id && (
                  <div className="border-t border-fg/5 px-4 pb-3">
                    <div className="mt-2 flex gap-4 font-mono text-[11px] text-fg/50 mb-2">
                      <span>Comisión: {formatoMoneda(o.comision)}</span>
                      <span>Total neto: {formatoMoneda(Number(o.cantidad) * Number(o.precio_ejecucion))}</span>
                    </div>
                    <ComentariosMaestro ordenId={o.id} esMaestro={false} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
