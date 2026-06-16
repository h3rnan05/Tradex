import { Badge, Card } from "@/components/primitives";

interface Destacado {
  ticker: string;
  precio: string;
  cambio_porcentaje: number;
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
          {datos.map((d) => (
            <button
              key={d.ticker}
              onClick={() => onSeleccionar(d.ticker)}
              className="flex w-full items-center justify-between border-b border-fg/5 px-3 py-2.5 text-left last:border-0 hover:bg-fg/5"
            >
              <span className="font-mono text-sm font-bold text-fg">{d.ticker}</span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-sm tabular-nums text-fg/80">${Number(d.precio).toFixed(2)}</span>
                <Badge tone={tono}>
                  {d.cambio_porcentaje >= 0 ? "▲ +" : "▼ "}
                  {d.cambio_porcentaje.toFixed(2)}%
                </Badge>
              </span>
            </button>
          ))}
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
