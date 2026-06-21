"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";

interface PrecioDestacado {
  ticker: string;
  precio: string;
  cambio_porcentaje: number;
}

interface RetoActivoInfo {
  id: string;
  escenario_id: string | null;
}

const RUTAS_PUBLICAS = ["/", "/login"];

function limpiar(t: string) {
  return t.replace("-USD", "").replace("=X", "").replace(".MX", "");
}

export default function TickerTape() {
  const pathname = usePathname();
  const router = useRouter();
  const [datos, setDatos] = useState<PrecioDestacado[]>([]);
  const [retoId, setRetoId] = useState<string | null>(null);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    setAutenticado(!!obtenerSesion());
  }, [pathname]);

  const esRutaPublica = RUTAS_PUBLICAS.includes(pathname ?? "");

  // Detecta si hay un reto de crisis en curso para el alumno: en ese caso el
  // ticker se convierte en el mercado del escenario (cayendo en rojo).
  useEffect(() => {
    if (!autenticado || esRutaPublica) return;
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== "alumno") {
      setRetoId(null);
      return;
    }
    let activo = true;
    async function detectar() {
      try {
        const reto = await api.get<RetoActivoInfo | null>("/retos/activo");
        if (activo) setRetoId(reto && reto.escenario_id ? reto.id : null);
      } catch {
        if (activo) setRetoId(null);
      }
    }
    detectar();
    const interval = setInterval(detectar, 60000);
    return () => {
      activo = false;
      clearInterval(interval);
    };
  }, [autenticado, esRutaPublica]);

  useEffect(() => {
    if (!autenticado || esRutaPublica) return;
    let activo = true;

    async function cargar() {
      try {
        const ruta = retoId ? `/retos/${retoId}/mercado` : "/precios/trending";
        const data = await api.get<PrecioDestacado[]>(ruta);
        if (activo && data.length > 0) setDatos(data);
      } catch {
        // se mantiene el último dato conocido
      }
    }

    setDatos([]);
    cargar();
    const interval = setInterval(cargar, 15000);
    return () => {
      activo = false;
      clearInterval(interval);
    };
  }, [autenticado, esRutaPublica, retoId]);

  if (esRutaPublica || !autenticado || datos.length === 0) return null;

  const promedioCambio = datos.reduce((acc, d) => acc + d.cambio_porcentaje, 0) / datos.length;
  // En un reto de crisis basta con que el mercado caiga; fuera del reto exigimos
  // una caída fuerte para declarar pánico.
  const crisis = retoId ? promedioCambio <= -1.5 : promedioCambio <= -2.5;

  const fila = [...datos, ...datos];

  return (
    <div className={crisis ? "animate-crisis-flash" : ""}>
      {crisis && (
        <div className="bg-perdida px-3 py-0.5 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-white">
          {retoId
            ? `⚠ El mercado se desploma — ${promedioCambio.toFixed(1)}%`
            : "⚠ Venta masiva en el mercado — sentimiento de pánico"}
        </div>
      )}
      <div
        className={`hidden items-center overflow-hidden px-4 py-2 md:flex ${crisis ? "bg-perdida" : "bg-accent"}`}
      >
        <span
          className={`mr-4 shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest ${
            crisis ? "text-white" : "text-black"
          }`}
        >
          {retoId ? (crisis ? "▼ CRASH ·" : "RETO ·") : "TRADEX TERMINAL ·"}
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="flex animate-ticker gap-8 whitespace-nowrap pr-8">
            {fila.map((d, i) => {
              const sube = d.cambio_porcentaje >= 0;
              const isSecondHalf = i >= datos.length;
              const navegable = !retoId && !isSecondHalf;
              return (
                <button
                  key={`${d.ticker}-${i}`}
                  onClick={navegable ? () => router.push(`/alumno/operar?t=${encodeURIComponent(d.ticker)}`) : undefined}
                  tabIndex={navegable ? 0 : -1}
                  aria-hidden={isSecondHalf}
                  className={`flex items-center gap-2 font-mono text-[11px] font-semibold tracking-wide transition-opacity ${
                    navegable ? "cursor-pointer hover:opacity-75" : ""
                  }`}
                >
                  <span className={`font-bold ${crisis ? "text-white" : "text-black"}`}>{limpiar(d.ticker)}</span>
                  <span className={crisis ? "text-white/75" : "text-black/75"}>${Number(d.precio).toFixed(2)}</span>
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-white ${
                      sube ? "bg-ganancia" : crisis ? "bg-black/30" : "bg-perdida"
                    }`}
                  >
                    {sube ? "▲" : "▼"} {sube ? "+" : ""}
                    {d.cambio_porcentaje.toFixed(2)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
