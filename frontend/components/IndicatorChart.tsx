"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calcularRSI, calcularSMA, INDICADORES_DISPONIBLES } from "@/lib/indicadores";

interface PuntoPrecio {
  fecha: string;
  precio: string;
}

export default function IndicatorChart({
  historial,
  indicadoresActivos,
}: {
  historial: PuntoPrecio[];
  indicadoresActivos: string[];
}) {
  if (historial.length < 2) {
    return <p className="text-sm text-fg/40">No hay suficiente historial para graficar.</p>;
  }

  const precios = historial.map((p) => Number(p.precio));
  const sma5 = calcularSMA(precios, 5);
  const sma10 = calcularSMA(precios, 10);
  const sma20 = calcularSMA(precios, 20);
  const rsi = indicadoresActivos.includes("rsi") ? calcularRSI(precios, 14) : null;

  const datos = historial.map((p, i) => ({
    fecha: p.fecha,
    precio: precios[i],
    sma5: sma5[i],
    sma10: sma10[i],
    sma20: sma20[i],
    rsi: rsi ? rsi[i] : null,
  }));

  const subiendo = precios[precios.length - 1] >= precios[0];
  const colorPrecio = subiendo ? "#007a2e" : "#cc1a1a";

  const colorDe = (key: string) => INDICADORES_DISPONIBLES.find((i) => i.key === key)?.color ?? "#1a0e00";

  return (
    <div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,14,0,0.1)" />
            <XAxis dataKey="fecha" tick={{ fontSize: 10 }} minTickGap={30} />
            <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
            <Tooltip
              formatter={(value: number, name: string) => [value?.toFixed(2), name]}
              labelStyle={{ fontSize: 12 }}
            />
            <Line type="monotone" dataKey="precio" stroke={colorPrecio} strokeWidth={2} dot={false} name="Precio" />
            {indicadoresActivos.includes("sma5") && (
              <Line type="monotone" dataKey="sma5" stroke={colorDe("sma5")} strokeWidth={1.5} dot={false} name="SMA 5" />
            )}
            {indicadoresActivos.includes("sma10") && (
              <Line type="monotone" dataKey="sma10" stroke={colorDe("sma10")} strokeWidth={1.5} dot={false} name="SMA 10" />
            )}
            {indicadoresActivos.includes("sma20") && (
              <Line type="monotone" dataKey="sma20" stroke={colorDe("sma20")} strokeWidth={1.5} dot={false} name="SMA 20" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {rsi && (
        <div className="mt-3 h-24 w-full border-t border-fg/10 pt-2">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-fg/40">RSI (14)</p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datos} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,14,0,0.1)" />
              <XAxis dataKey="fecha" tick={{ fontSize: 10 }} minTickGap={30} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} ticks={[30, 50, 70]} />
              <ReferenceLine y={70} stroke="#cc1a1a" strokeDasharray="3 3" />
              <ReferenceLine y={30} stroke="#007a2e" strokeDasharray="3 3" />
              <Tooltip formatter={(value: number) => value?.toFixed(1)} />
              <Line type="monotone" dataKey="rsi" stroke={colorDe("rsi")} strokeWidth={1.5} dot={false} name="RSI" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
