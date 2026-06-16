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
import CandlestickChart from "@/components/CandlestickChart";
import { calcularRSI, calcularSMA, INDICADORES_DISPONIBLES } from "@/lib/indicadores";

interface PuntoPrecio {
  fecha: string;
  precio: string;
  apertura?: string | null;
  maximo?: string | null;
  minimo?: string | null;
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

  const overlays = [
    indicadoresActivos.includes("sma5") && { key: "sma5", color: colorDe("sma5"), valores: sma5 },
    indicadoresActivos.includes("sma10") && { key: "sma10", color: colorDe("sma10"), valores: sma10 },
    indicadoresActivos.includes("sma20") && { key: "sma20", color: colorDe("sma20"), valores: sma20 },
  ].filter((s): s is { key: string; color: string; valores: (number | null)[] } => !!s);

  const datosRsi = rsi ? historial.map((p, i) => ({ fecha: p.fecha, rsi: rsi[i] })) : null;

  return (
    <div>
      <CandlestickChart
        historial={historial.map((p) => ({
          fecha: p.fecha,
          precio: p.precio,
          apertura: p.apertura ?? null,
          maximo: p.maximo ?? null,
          minimo: p.minimo ?? null,
        }))}
        overlays={overlays}
      />

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
