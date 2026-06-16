interface PuntoPrecio {
  fecha: string;
  precio: string;
}

export default function PrecioChart({ historial }: { historial: PuntoPrecio[] }) {
  if (historial.length < 2) {
    return <p className="text-sm text-fg/40">No hay suficiente historial para graficar.</p>;
  }

  const precios = historial.map((p) => Number(p.precio));
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  const rango = max - min || 1;
  const ancho = 600;
  const alto = 220;
  const paso = ancho / (precios.length - 1);

  const coords = precios.map((precio, i) => ({
    x: i * paso,
    y: alto - ((precio - min) / rango) * alto,
  }));

  const puntos = coords.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `0,${alto} ${puntos} ${ancho},${alto}`;

  const subiendo = precios[precios.length - 1] >= precios[0];
  const color = subiendo ? "#007a2e" : "#cc1a1a";
  const lineasGrid = [0.25, 0.5, 0.75];

  return (
    <div>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="precioFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {lineasGrid.map((f) => (
          <line
            key={f}
            x1={0}
            x2={ancho}
            y1={alto * f}
            y2={alto * f}
            stroke="currentColor"
            className="text-fg/10"
            strokeWidth={1}
          />
        ))}
        <polygon points={area} fill="url(#precioFill)" />
        <polyline points={puntos} fill="none" stroke={color} strokeWidth={2} />
        <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r={3.5} fill={color} />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[11px] text-fg/40">
        <span>{historial[0].fecha}</span>
        <span>{historial[historial.length - 1].fecha}</span>
      </div>
    </div>
  );
}
