"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";

interface PrecioDestacado {
  ticker: string;
  precio: string;
  cambio_porcentaje: number;
}

export default function TickerTape() {
  const [datos, setDatos] = useState<PrecioDestacado[]>([]);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    setAutenticado(!!obtenerSesion());
  }, []);

  useEffect(() => {
    if (!autenticado) return;
    let activo = true;

    async function cargar() {
      try {
        const data = await api.get<PrecioDestacado[]>("/precios/destacados");
        if (activo && data.length > 0) setDatos(data);
      } catch {
        // se mantiene el último dato conocido
      }
    }

    cargar();
    const interval = setInterval(cargar, 15000);
    return () => {
      activo = false;
      clearInterval(interval);
    };
  }, [autenticado]);

  if (!autenticado || datos.length === 0) return null;

  const promedioCambio = datos.reduce((acc, d) => acc + d.cambio_porcentaje, 0) / datos.length;
  const crisis = promedioCambio <= -2.5;

  const fila = [...datos, ...datos];

  return (
    <div
      className={`sticky top-0 z-50 overflow-hidden border-b border-term-green/20 bg-term ${
        crisis ? "animate-crisis-flash" : ""
      }`}
    >
      {crisis && (
        <div className="border-b border-term-red/40 bg-term-red/10 px-3 py-0.5 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-term-red">
          ⚠ Venta masiva en el mercado — sentimiento de pánico
        </div>
      )}
      <div className="flex whitespace-nowrap py-1.5">
        <div className="flex animate-ticker gap-8 pr-8">
          {fila.map((d, i) => {
            const sube = d.cambio_porcentaje >= 0;
            return (
              <span key={`${d.ticker}-${i}`} className="flex items-center gap-2 font-mono text-xs tracking-wide">
                <span className="font-bold text-white/90">{d.ticker}</span>
                <span className={sube ? "text-term-green" : "text-term-red"}>
                  {d.precio === "—" ? "—" : `$${Number(d.precio).toFixed(2)}`}
                </span>
                <span className={sube ? "text-term-green" : "text-term-red"}>
                  {sube ? "▲" : "▼"} {sube ? "+" : ""}
                  {d.cambio_porcentaje.toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
