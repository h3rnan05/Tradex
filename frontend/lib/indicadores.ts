export function calcularSMA(precios: number[], periodo: number): (number | null)[] {
  return precios.map((_, i) => {
    if (i < periodo - 1) return null;
    const ventana = precios.slice(i - periodo + 1, i + 1);
    return ventana.reduce((a, b) => a + b, 0) / periodo;
  });
}

export function calcularRSI(precios: number[], periodo = 14): (number | null)[] {
  const rsi: (number | null)[] = precios.map(() => null);
  if (precios.length <= periodo) return rsi;

  const cambios = precios.slice(1).map((p, i) => p - precios[i]);

  let gananciaPromedio =
    cambios.slice(0, periodo).filter((c) => c > 0).reduce((a, c) => a + c, 0) / periodo;
  let perdidaPromedio =
    cambios.slice(0, periodo).filter((c) => c < 0).reduce((a, c) => a - c, 0) / periodo;

  rsi[periodo] = perdidaPromedio === 0 ? 100 : 100 - 100 / (1 + gananciaPromedio / perdidaPromedio);

  for (let i = periodo + 1; i < precios.length; i++) {
    const cambio = cambios[i - 1];
    const ganancia = cambio > 0 ? cambio : 0;
    const perdida = cambio < 0 ? -cambio : 0;
    gananciaPromedio = (gananciaPromedio * (periodo - 1) + ganancia) / periodo;
    perdidaPromedio = (perdidaPromedio * (periodo - 1) + perdida) / periodo;
    rsi[i] = perdidaPromedio === 0 ? 100 : 100 - 100 / (1 + gananciaPromedio / perdidaPromedio);
  }

  return rsi;
}

export interface IndicadorInfo {
  key: string;
  label: string;
  hint: string;
  color: string;
}

export const INDICADORES_DISPONIBLES: IndicadorInfo[] = [
  {
    key: "sma5",
    label: "Media móvil (5)",
    hint: "Promedio del precio de los últimos 5 días. Reacciona rápido a los cambios recientes.",
    color: "#ff6600",
  },
  {
    key: "sma10",
    label: "Media móvil (10)",
    hint: "Promedio de los últimos 10 días. Suaviza el ruido de corto plazo.",
    color: "#0077b6",
  },
  {
    key: "sma20",
    label: "Media móvil (20)",
    hint: "Promedio de los últimos 20 días. Útil para ver la tendencia de mediano plazo.",
    color: "#6d28d9",
  },
  {
    key: "rsi",
    label: "RSI (14)",
    hint: "Mide si el activo está sobrecomprado (>70) o sobrevendido (<30) en los últimos 14 días.",
    color: "#cc1a1a",
  },
];
