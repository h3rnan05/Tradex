interface PuntoPrecio {
  fecha: string;
  precio: string;
}

export default function PrecioChart({ historial }: { historial: PuntoPrecio[] }) {
  if (historial.length < 2) {
    return <p className="text-sm text-ink/40">No hay suficiente historial para graficar.</p>;
  }

  const precios = historial.map((p) => Number(p.precio));
  const min = Math.min(...precios);
  const max = Math.max(...precios);
  const rango = max - min || 1;
  const ancho = 600;
  const alto = 160;
  const paso = ancho / (precios.length - 1);

  const puntos = precios
    .map((precio, i) => {
      const x = i * paso;
      const y = alto - ((precio - min) / rango) * alto;
      return `${x},${y}`;
    })
    .join(" ");

  const subiendo = precios[precios.length - 1] >= precios[0];

  return (
    <div>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full" preserveAspectRatio="none">
        <polyline
          points={puntos}
          fill="none"
          stroke={subiendo ? "#16a34a" : "#dc2626"}
          strokeWidth={2}
        />
      </svg>
      <div className="mt-1 flex justify-between text-xs text-ink/30">
        <span>{historial[0].fecha}</span>
        <span>{historial[historial.length - 1].fecha}</span>
      </div>
    </div>
  );
}
