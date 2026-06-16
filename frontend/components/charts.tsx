"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fmtDate, fmtNumber } from "@/components/primitives";

type SeriesKey = {
  key: string;
  label: string;
  color: string;
  width?: number;
};

const COLORS = {
  border: "var(--color-border)",
};

function CustomTooltip({
  active,
  payload,
  label,
  decimals = 2,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string | number;
  decimals?: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="border border-fg/20 bg-canvas p-3 text-[12px] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.3)]">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-fg/50">
        {fmtDate(String(label))}
      </div>
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="size-2 rounded-none" style={{ background: p.color }} aria-hidden />
            <span className="text-fg/70">{p.name ?? ""}</span>
            <span className="ml-auto font-mono tabular-nums text-fg">
              {fmtNumber(p.value, { decimals })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TimeSeriesChart({
  data,
  series,
  height = 260,
  yDecimals = 2,
}: {
  data: Array<Record<string, number | string | null>>;
  series: SeriesKey[];
  height?: number;
  yDecimals?: number;
}) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => fmtDate(String(v)).slice(0, 6)}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
          />
          <YAxis
            tickFormatter={(v) => fmtNumber(v, { decimals: yDecimals, compact: true })}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip content={<CustomTooltip decimals={yDecimals} />} cursor={{ stroke: COLORS.border }} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={s.width ?? 1.75}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AreaChartCmp({
  data,
  dataKey,
  label,
  color = "var(--color-green)",
  height = 220,
  yDecimals = 2,
}: {
  data: Array<Record<string, number | string | null>>;
  dataKey: string;
  label: string;
  color?: string;
  height?: number;
  yDecimals?: number;
}) {
  const gradId = `grad-${dataKey}`;
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => fmtDate(String(v)).slice(0, 6)}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
          />
          <YAxis
            tickFormatter={(v) => fmtNumber(v, { decimals: 0, compact: true })}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip decimals={yDecimals} />} cursor={{ stroke: COLORS.border }} />
          <Area
            type="monotone"
            dataKey={dataKey}
            name={label}
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${gradId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
