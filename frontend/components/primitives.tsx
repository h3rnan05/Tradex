import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-none border border-fg/15 border-l-2 border-l-accent bg-panel p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.1)] ${className}`}
    >
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
    neutral: "bg-fg/10 text-fg/70",
    ganancia: "bg-ganancia/15 text-ganancia",
    perdida: "bg-perdida/15 text-perdida",
    accent: "bg-accent/15 text-accent",
  };
  return (
    <span
      className={`inline-flex items-center rounded-none px-2.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide ${tonos[tone]}`}
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
    ganancia: "text-ganancia",
    perdida: "text-perdida",
    accent: "text-accent",
  };
  return (
    <Card>
      <p className="font-mono text-[11px] uppercase tracking-widest text-fg/50">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-bold tabular-nums ${colores[tone]}`}>{value}</p>
      {detail && <p className="mt-1 text-xs text-fg/50">{detail}</p>}
    </Card>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="mb-1 font-mono text-[10px] font-medium uppercase tracking-widest text-fg/50">
            {eyebrow}
          </div>
        )}
        <h2 className="text-lg font-semibold tracking-tight text-fg">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-[13px] text-fg/60">{description}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-none border border-dashed border-fg/20 bg-panel p-12 text-center">
      <div className="text-sm font-medium text-fg">{title}</div>
      {description && <p className="mt-1.5 max-w-md text-[13px] text-fg/60">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function formatoMoneda(valor: string | number) {
  return `$${Number(valor).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatoPorcentaje(valor: string | number) {
  return `${Number(valor) >= 0 ? "+" : ""}${Number(valor).toFixed(2)}%`;
}

export function fmtNumber(
  n: number | null | undefined,
  opts: { decimals?: number; compact?: boolean } = {}
): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const { decimals = 2, compact = false } = opts;
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: compact ? "compact" : "standard",
  }).format(n);
}

export function fmtDate(d: string | number | null | undefined): string {
  try {
    if (d === null || d === undefined || d === "") return "—";
    const date = typeof d === "number" ? new Date(d) : new Date(d + (String(d).length === 10 ? "T00:00:00Z" : ""));
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("es-MX", { year: "numeric", month: "short", day: "2-digit" }).format(date);
  } catch {
    return "—";
  }
}
