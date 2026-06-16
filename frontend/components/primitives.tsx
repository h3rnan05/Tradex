import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-fg/10 bg-panel p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ganancia" | "perdida" | "accent";
}) {
  const tonos: Record<string, string> = {
    neutral: "bg-fg/5 text-fg/70",
    ganancia: "bg-ganancia/10 text-ganancia",
    perdida: "bg-perdida/10 text-perdida",
    accent: "bg-accent/10 text-accent",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide ${tonos[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "ganancia" | "perdida" | "accent";
}) {
  const colores: Record<string, string> = {
    neutral: "text-fg",
    ganancia: "text-ganancia drop-shadow-[0_0_6px_rgba(0,255,140,0.5)]",
    perdida: "text-perdida drop-shadow-[0_0_6px_rgba(255,59,59,0.5)]",
    accent: "text-accent drop-shadow-[0_0_6px_rgba(255,176,0,0.5)]",
  };
  return (
    <Card>
      <p className="font-mono text-[11px] uppercase tracking-widest text-fg/40">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-bold tabular-nums ${colores[tone]}`}>{value}</p>
      {detail && <p className="mt-1 text-xs text-fg/40">{detail}</p>}
    </Card>
  );
}

export function formatoMoneda(valor: string | number) {
  return `$${Number(valor).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatoPorcentaje(valor: string | number) {
  return `${Number(valor) >= 0 ? "+" : ""}${Number(valor).toFixed(2)}%`;
}
