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
    <div className={crisis ? "animate-crisis-flash" : ""}>
      {crisis && (
        <div className="bg-perdida px-3 py-0.5 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-white">
          ⚠ Venta masiva en el mercado — sentimiento de pánico
        </div>
      )}
      <div className="hidden items-center overflow-hidden bg-accent px-4 py-2 md:flex">
        <span className="mr-4 shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-black">
          TRADEX TERMINAL ·
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="flex animate-ticker gap-8 whitespace-nowrap pr-8">
            {fila.map((d, i) => {
              const sube = d.cambio_porcentaje >= 0;
              return (
                <span key={`${d.ticker}-${i}`} className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-wide">
                  <span className="font-bold text-black">{d.ticker}</span>
                  <span className="text-black/75">${Number(d.precio).toFixed(2)}</span>
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-white ${
                      sube ? "bg-ganancia" : "bg-perdida"
                    }`}
                  >
                    {sube ? "▲" : "▼"} {sube ? "+" : ""}
                    {d.cambio_porcentaje.toFixed(2)}%
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
