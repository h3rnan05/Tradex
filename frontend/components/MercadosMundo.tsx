"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/primitives";
import { calcularEstadoMercado, MERCADOS } from "@/lib/mercados";

export default function MercadosMundo() {
  const [ahora, setAhora] = useState<Date | null>(null);

  useEffect(() => {
    setAhora(new Date());
    const intervalo = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(intervalo);
  }, []);

  if (!ahora) return null;

  const minutosAhoraUtc = ahora.getUTCHours() * 60 + ahora.getUTCMinutes();

  return (
    <div className="flex h-full min-h-[300px] flex-col rounded-none border border-fg/20 bg-panel/50 p-4">
      <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-widest text-fg/40">
        Mercados globales en vivo
      </p>

      <div className="flex flex-col gap-2 overflow-y-auto">
        {MERCADOS.map((mercado) => {
          const estado = calcularEstadoMercado(mercado, ahora);
          const span = estado.finUtcMin >= estado.inicioUtcMin
            ? estado.finUtcMin - estado.inicioUtcMin
            : 1440 - estado.inicioUtcMin + estado.finUtcMin;

          return (
            <div
              key={mercado.codigo}
              className={`border p-3 ${
                estado.abierto ? "border-ganancia/40 bg-ganancia/5" : "border-fg/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span aria-hidden>{estado.esDeNoche ? "🌙" : "☀️"}</span>
                  <div>
                    <p className="font-mono text-[12px] font-semibold text-fg">{mercado.nombre}</p>
                    <p className="font-mono text-[10px] text-fg/40">{mercado.ciudad}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[13px] font-bold tabular-nums text-fg">{estado.horaLocal}</p>
                  <Badge tone={estado.abierto ? "ganancia" : "neutral"}>
                    {estado.abierto ? "Abierta" : "Cerrada"}
                  </Badge>
                </div>
              </div>

              <p className="mt-2 font-mono text-[11px] text-fg/60">{estado.descripcion}</p>

              <div className="relative mt-2 h-1.5 w-full bg-fg/10">
                <div
                  className="absolute top-0 h-1.5 bg-accent/50"
                  style={{
                    left: `${(estado.inicioUtcMin / 1440) * 100}%`,
                    width: `${(span / 1440) * 100}%`,
                  }}
                />
                <div
                  className="absolute top-0 h-1.5 w-[2px] bg-fg"
                  style={{ left: `${(minutosAhoraUtc / 1440) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center font-mono text-[10px] text-fg/30">
        Busca un ticker arriba o elige uno de la watchlist para ver su cotización.
      </p>
    </div>
  );
}
