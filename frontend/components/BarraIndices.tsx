"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Indice {
  ticker: string;
  nombre: string;
  precio: string;
  cambio_porcentaje: number;
  sparkline?: number[];
}

function MiniSparkline({ data, subiendo }: { data: number[]; subiendo: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 72;
  const h = 28;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`)
    .join(" ");
  const color = subiendo ? "#22c55e" : "#ef4444";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 opacity-80">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function BarraIndices() {
  const [indices, setIndices] = useState<Indice[]>([]);

  useEffect(() => {
    api
      .get<Indice[]>("/precios/indices")
      .then(setIndices)
      .catch(() => {});
  }, []);

  if (indices.length === 0) return null;

  return (
    <div className="mb-4 overflow-x-auto rounded-none border border-fg/10 bg-panel">
      <div className="flex min-w-max divide-x divide-fg/10">
        {indices.map((ind) => {
          const sube = ind.cambio_porcentaje >= 0;
          const sparkData = (ind.sparkline || []).map(Number);
          return (
            <div key={ind.ticker} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-semibold text-accent">{ind.nombre}</p>
                <p className="font-mono text-sm font-bold tabular-nums text-fg">
                  {Number(ind.precio).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className={`font-mono text-[11px] font-semibold tabular-nums ${sube ? "text-ganancia" : "text-perdida"}`}>
                  {sube ? "+" : ""}{ind.cambio_porcentaje.toFixed(2)}%
                </p>
              </div>
              {sparkData.length > 1 && <MiniSparkline data={sparkData} subiendo={sube} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
