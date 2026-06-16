import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ganancia" | "perdida";
}) {
  const tonos: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-700",
    ganancia: "bg-emerald-50 text-ganancia",
    perdida: "bg-red-50 text-perdida",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tonos[tone]}`}>
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ganancia" | "perdida";
}) {
  const colores: Record<string, string> = {
    neutral: "text-slate-900",
    ganancia: "text-ganancia",
    perdida: "text-perdida",
  };
  return (
    <Card>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${colores[tone]}`}>{value}</p>
    </Card>
  );
}

export function formatoMoneda(valor: string | number) {
  return `$${Number(valor).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatoPorcentaje(valor: string | number) {
  return `${Number(valor) >= 0 ? "+" : ""}${Number(valor).toFixed(2)}%`;
}
