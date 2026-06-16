interface PuntoOHLC {
  fecha: string;
  precio: string;
  apertura: string | null;
  maximo: string | null;
  minimo: string | null;
}

interface SerieOverlay {
  key: string;
  color: string;
  valores: (number | null)[];
}

export default function CandlestickChart({
  historial,
  overlays = [],
}: {
  historial: PuntoOHLC[];
  overlays?: SerieOverlay[];
}) {
  if (historial.length < 2) {
    return <p className="text-sm text-fg/40">No hay suficiente historial para graficar.</p>;
  }

  const velas = historial.map((p) => {
    const cierre = Number(p.precio);
    const apertura = p.apertura !== null ? Number(p.apertura) : cierre;
    const maximo = p.maximo !== null ? Math.max(Number(p.maximo), apertura, cierre) : Math.max(apertura, cierre);
    const minimo = p.minimo !== null ? Math.min(Number(p.minimo), apertura, cierre) : Math.min(apertura, cierre);
    return { apertura, cierre, maximo, minimo };
  });

  const todosValores = velas.flatMap((v) => [v.maximo, v.minimo]);
  const min = Math.min(...todosValores);
  const max = Math.max(...todosValores);
  const rango = max - min || 1;

  const ancho = 700;
  const alto = 260;
  const margenY = alto * 0.05;
  const altoUtil = alto - margenY * 2;
  const paso = ancho / velas.length;
  const anchoVela = Math.min(paso * 0.6, 14);

  const escalaY = (valor: number) => margenY + altoUtil - ((valor - min) / rango) * altoUtil;

  return (
    <div>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((f) => (
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

        {velas.map((v, i) => {
          const x = i * paso + paso / 2;
          const subiendo = v.cierre >= v.apertura;
          const color = subiendo ? "#007a2e" : "#cc1a1a";
          const yMax = escalaY(v.maximo);
          const yMin = escalaY(v.minimo);
          const yApertura = escalaY(v.apertura);
          const yCierre = escalaY(v.cierre);
          const yCuerpoTop = Math.min(yApertura, yCierre);
          const altoCuerpo = Math.max(Math.abs(yCierre - yApertura), 1);

          return (
            <g key={i}>
              <line x1={x} x2={x} y1={yMax} y2={yMin} stroke={color} strokeWidth={1} />
              <rect
                x={x - anchoVela / 2}
                y={yCuerpoTop}
                width={anchoVela}
                height={altoCuerpo}
                fill={color}
              />
            </g>
          );
        })}

        {overlays.map((serie) => {
          const puntos = serie.valores
            .map((valor, i) => (valor === null ? null : `${i * paso + paso / 2},${escalaY(valor)}`))
            .filter((p): p is string => p !== null)
            .join(" ");
          if (!puntos) return null;
          return <polyline key={serie.key} points={puntos} fill="none" stroke={serie.color} strokeWidth={1.5} />;
        })}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[11px] text-fg/40">
        <span>{historial[0].fecha}</span>
        <span>{historial[historial.length - 1].fecha}</span>
      </div>
    </div>
  );
}
