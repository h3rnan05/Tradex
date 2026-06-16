"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
  volumen?: number | null;
}

function TooltipPrecio({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="border border-fg/20 bg-panel px-3 py-2 font-mono text-xs shadow-lg">
      <p className="mb-1 text-fg/50">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: ${Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
}

function crearPuntoFinal(colorLinea: string, ultimoIndice: number) {
  return function PuntoFinalRenderer(props: any) {
    const { cx, cy, index } = props;
    if (index !== ultimoIndice) return null;
    return <circle key="punto-final" cx={cx} cy={cy} r={4} fill={colorLinea} stroke="#faf6ed" strokeWidth={2} />;
  };
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

  const colorDe = (key: string) => INDICADORES_DISPONIBLES.find((i) => i.key === key)?.color ?? "#888";

  const datos = historial.map((p, i) => ({
    fecha: p.fecha,
    precio: precios[i],
    sma5: indicadoresActivos.includes("sma5") ? sma5[i] : null,
    sma10: indicadoresActivos.includes("sma10") ? sma10[i] : null,
    sma20: indicadoresActivos.includes("sma20") ? sma20[i] : null,
    volumen: p.volumen ?? null,
  }));

  const hayVolumen = historial.some((p) => p.volumen !== null && p.volumen !== undefined);

  const precioApertura = precios[0];
  const precioActual = precios[precios.length - 1];
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  const margen = (max - min) * 0.1 || max * 0.02;

  const subiendo = precioActual >= precioApertura;
  const colorLinea = subiendo ? "#16c172" : "#ff4d4d";

  const datosRsi = rsi ? historial.map((p, i) => ({ fecha: p.fecha, rsi: rsi[i] })) : null;

  return (
    <div>
      <div className="rounded-sm border border-fg/10 bg-canvas p-4 shadow-sm">
        <ResponsiveContainer width="100%" height={420}>
          <AreaChart data={datos} margin={{ top: 16, right: 64, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="precioGradiente" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorLinea} stopOpacity={0.4} />
                <stop offset="60%" stopColor={colorLinea} stopOpacity={0.08} />
                <stop offset="100%" stopColor={colorLinea} stopOpacity={0} />
              </linearGradient>
              <filter id="brilloLinea" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={colorLinea} floodOpacity="0.45" />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(26,14,0,0.07)" vertical={false} />
            <XAxis
              dataKey="fecha"
              tick={{ fontSize: 11, fill: "rgba(26,14,0,0.45)" }}
              minTickGap={60}
              axisLine={{ stroke: "rgba(26,14,0,0.15)" }}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              domain={[min - margen, max + margen]}
              tick={{ fontSize: 11, fill: "rgba(26,14,0,0.5)" }}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
              orientation="right"
              width={60}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine
              y={precioApertura}
              stroke="rgba(26,14,0,0.4)"
              strokeDasharray="4 4"
              label={{
                value: `$${precioApertura.toFixed(2)}`,
                position: "insideTopLeft",
                fill: "rgba(26,14,0,0.6)",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <Tooltip content={<TooltipPrecio />} />
            <Area
              type="monotone"
              dataKey="precio"
              name="Precio"
              stroke={colorLinea}
              strokeWidth={2.5}
              fill="url(#precioGradiente)"
              filter="url(#brilloLinea)"
              dot={crearPuntoFinal(colorLinea, datos.length - 1) as any}
              activeDot={{ r: 5, fill: colorLinea, stroke: "#faf6ed", strokeWidth: 2 }}
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

        {hayVolumen && (
          <div className="-mt-2">
            <ResponsiveContainer width="100%" height={72}>
              <BarChart data={datos} margin={{ top: 0, right: 64, left: 4, bottom: 0 }}>
                <XAxis dataKey="fecha" hide />
                <YAxis hide domain={[0, "auto"]} />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload || payload.length === 0) return null;
                    return (
                      <div className="border border-fg/20 bg-panel px-3 py-2 font-mono text-xs shadow-lg">
                        <p className="text-fg/50">{label}</p>
                        <p className="text-fg/70">Vol: {Number(payload[0].value).toLocaleString("en-US")}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="volumen" fill={colorLinea} opacity={0.45} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-center font-mono text-[10px] uppercase tracking-widest text-fg/30">Volumen</p>
          </div>
        )}
      </div>

      {datosRsi && (
        <div className="mt-3 h-28 w-full rounded-sm border border-fg/10 bg-canvas p-3 shadow-sm">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-fg/40">RSI (14)</p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datosRsi} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(26,14,0,0.08)" />
              <XAxis dataKey="fecha" tick={{ fontSize: 10 }} minTickGap={30} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} ticks={[30, 50, 70]} />
              <ReferenceLine y={70} stroke="#cc1a1a" strokeDasharray="3 3" />
              <ReferenceLine y={30} stroke="#007a2e" strokeDasharray="3 3" />
              <Tooltip formatter={(value: number) => value?.toFixed(1)} />
              <Line type="monotone" dataKey="rsi" stroke={colorDe("rsi")} strokeWidth={2} dot={false} name="RSI" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
