"use client";

import {
  Area,
  AreaChart,
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
  apertura?: string | null;
  maximo?: string | null;
  minimo?: string | null;
}

function TooltipPrecio({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="border border-fg/20 bg-panel px-3 py-2 font-mono text-xs shadow-sm">
      <p className="mb-1 text-fg/50">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: ${Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
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

  const colorDe = (key: string) => INDICADORES_DISPONIBLES.find((i) => i.key === key)?.color ?? "#1a0e00";

  const datos = historial.map((p, i) => ({
    fecha: p.fecha,
    precio: precios[i],
    sma5: indicadoresActivos.includes("sma5") ? sma5[i] : null,
    sma10: indicadoresActivos.includes("sma10") ? sma10[i] : null,
    sma20: indicadoresActivos.includes("sma20") ? sma20[i] : null,
  }));

  const min = Math.min(...precios);
  const max = Math.max(...precios);
  const margen = (max - min) * 0.08 || max * 0.02;

  const subiendo = precios[precios.length - 1] >= precios[0];
  const colorLinea = subiendo ? "#007a2e" : "#cc1a1a";

  const datosRsi = rsi ? historial.map((p, i) => ({ fecha: p.fecha, rsi: rsi[i] })) : null;

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="precioGradiente" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorLinea} stopOpacity={0.25} />
              <stop offset="100%" stopColor={colorLinea} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,14,0,0.08)" vertical={false} />
          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 10, fill: "rgba(26,14,0,0.5)" }}
            minTickGap={50}
            axisLine={{ stroke: "rgba(26,14,0,0.15)" }}
            tickLine={false}
          />
          <YAxis
            domain={[min - margen, max + margen]}
            tick={{ fontSize: 10, fill: "rgba(26,14,0,0.5)" }}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            width={48}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<TooltipPrecio />} />
          <Area
            type="monotone"
            dataKey="precio"
            name="Precio"
            stroke={colorLinea}
            strokeWidth={2}
            fill="url(#precioGradiente)"
            dot={false}
            isAnimationActive={false}
          />
          {indicadoresActivos.includes("sma5") && (
            <Area
              type="monotone"
              dataKey="sma5"
              name="SMA 5"
              stroke={colorDe("sma5")}
              strokeWidth={1.5}
              fill="none"
              dot={false}
              isAnimationActive={false}
            />
          )}
          {indicadoresActivos.includes("sma10") && (
            <Area
              type="monotone"
              dataKey="sma10"
              name="SMA 10"
              stroke={colorDe("sma10")}
              strokeWidth={1.5}
              fill="none"
              dot={false}
              isAnimationActive={false}
            />
          )}
          {indicadoresActivos.includes("sma20") && (
            <Area
              type="monotone"
              dataKey="sma20"
              name="SMA 20"
              stroke={colorDe("sma20")}
              strokeWidth={1.5}
              fill="none"
              dot={false}
              isAnimationActive={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      {datosRsi && (
        <div className="mt-3 h-24 w-full border-t border-fg/10 pt-2">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-fg/40">RSI (14)</p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datosRsi} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
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
