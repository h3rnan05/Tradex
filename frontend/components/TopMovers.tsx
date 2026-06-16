import { Badge, Card } from "@/components/primitives";

interface Destacado {
  ticker: string;
  precio: string;
  cambio_porcentaje: number;
  sparkline?: number[];
}

function Sparkline({ data, subiendo }: { data: number[]; subiendo: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 72;
  const h = 32;
  const pad = 2;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - pad - ((v - min) / range) * (h - pad * 2)}`)
    .join(" ");
  const color = subiendo ? "#22c55e" : "#ef4444";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 opacity-85">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function TopMovers({
  destacados,
  onSeleccionar,
}: {
  destacados: Destacado[];
  onSeleccionar: (ticker: string) => void;
}) {
  const ordenados = [...destacados].sort((a, b) => b.cambio_porcentaje - a.cambio_porcentaje);
  const ganadoras = ordenados.filter((d) => d.cambio_porcentaje >= 0).slice(0, 5);
  const perdedoras = ordenados
    .filter((d) => d.cambio_porcentaje < 0)
    .slice(-5)
    .reverse();

  function Lista({ titulo, datos, tono }: { titulo: string; datos: Destacado[]; tono: "ganancia" | "perdida" }) {
    return (
      <div>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">{titulo}</p>
        <div className="overflow-hidden rounded-none border border-fg/10 bg-canvas">
          {datos.length === 0 && <p className="p-3 text-sm text-fg/40">Sin datos.</p>}
          {datos.map((d) => {
            const sube = d.cambio_porcentaje >= 0;
            return (
              <button
                key={d.ticker}
                onClick={() => onSeleccionar(d.ticker)}
                className="flex w-full items-center justify-between border-b border-fg/5 px-3 py-2.5 text-left last:border-0 hover:bg-fg/5"
              >
                <span className="font-mono text-sm font-bold text-fg">{d.ticker}</span>
                {d.sparkline && d.sparkline.length > 1 && (
                  <Sparkline data={d.sparkline.map(Number)} subiendo={sube} />
                )}
                <span className="flex items-center gap-2">
                  <span className="font-mono text-sm tabular-nums text-fg/80">${Number(d.precio).toFixed(2)}</span>
                  <Badge tone={tono}>
                    {sube ? "▲ +" : "▼ "}
                    {d.cambio_porcentaje.toFixed(2)}%
                  </Badge>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-widest text-fg/40">
        Movimiento del día
      </p>
      <div className="flex flex-col gap-5">
        <Lista titulo="Mayor subida" datos={ganadoras} tono="ganancia" />
        <Lista titulo="Mayor caída" datos={perdedoras} tono="perdida" />
      </div>
      <p className="mt-4 text-center text-xs text-fg/30">Busca un ticker o elige uno de la lista para ver su cotización.</p>
    </Card>
  );
}
