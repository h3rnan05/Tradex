export function calcularSMA(precios: number[], periodo: number): (number | null)[] {
  return precios.map((_, i) => {
    if (i < periodo - 1) return null;
    const ventana = precios.slice(i - periodo + 1, i + 1);
    return ventana.reduce((a, b) => a + b, 0) / periodo;
  });
}

export function calcularEMA(precios: number[], periodo: number): (number | null)[] {
  const ema: (number | null)[] = precios.map(() => null);
  if (precios.length < periodo) return ema;
  const k = 2 / (periodo + 1);
  const semilla = precios.slice(0, periodo).reduce((a, b) => a + b, 0) / periodo;
  ema[periodo - 1] = semilla;
  for (let i = periodo; i < precios.length; i++) {
    ema[i] = precios[i] * k + (ema[i - 1] as number) * (1 - k);
  }
  return ema;
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

export interface BandasBollinger {
  superior: (number | null)[];
  media: (number | null)[];
  inferior: (number | null)[];
}

export function calcularBandasBollinger(precios: number[], periodo = 20, desviaciones = 2): BandasBollinger {
  const media = calcularSMA(precios, periodo);
  const superior: (number | null)[] = [];
  const inferior: (number | null)[] = [];
  for (let i = 0; i < precios.length; i++) {
    if (i < periodo - 1 || media[i] === null) {
      superior.push(null);
      inferior.push(null);
      continue;
    }
    const ventana = precios.slice(i - periodo + 1, i + 1);
    const m = media[i] as number;
    const varianza = ventana.reduce((a, p) => a + (p - m) ** 2, 0) / periodo;
    const desviacion = Math.sqrt(varianza);
    superior.push(m + desviaciones * desviacion);
    inferior.push(m - desviaciones * desviacion);
  }
  return { superior, media, inferior };
}

export interface ResultadoMACD {
  macd: (number | null)[];
  señal: (number | null)[];
  histograma: (number | null)[];
}

export function calcularMACD(precios: number[], rapida = 12, lenta = 26, señalPeriodo = 9): ResultadoMACD {
  const emaRapida = calcularEMA(precios, rapida);
  const emaLenta = calcularEMA(precios, lenta);
  const macd: (number | null)[] = precios.map((_, i) => {
    if (emaRapida[i] === null || emaLenta[i] === null) return null;
    return (emaRapida[i] as number) - (emaLenta[i] as number);
  });

  const valoresMacd = macd.filter((v): v is number => v !== null);
  const inicioValido = macd.findIndex((v) => v !== null);
  const señal: (number | null)[] = macd.map(() => null);

  if (valoresMacd.length >= señalPeriodo && inicioValido >= 0) {
    const k = 2 / (señalPeriodo + 1);
    const semilla = valoresMacd.slice(0, señalPeriodo).reduce((a, b) => a + b, 0) / señalPeriodo;
    señal[inicioValido + señalPeriodo - 1] = semilla;
    for (let i = inicioValido + señalPeriodo; i < macd.length; i++) {
      señal[i] = (macd[i] as number) * k + (señal[i - 1] as number) * (1 - k);
    }
  }

  const histograma: (number | null)[] = macd.map((v, i) => {
    if (v === null || señal[i] === null) return null;
    return v - (señal[i] as number);
  });

  return { macd, señal, histograma };
}

export interface ResultadoEstocastico {
  k: (number | null)[];
  d: (number | null)[];
}

export function calcularEstocastico(
  maximos: number[],
  minimos: number[],
  cierres: number[],
  periodoK = 14,
  periodoD = 3
): ResultadoEstocastico {
  const k: (number | null)[] = cierres.map((_, i) => {
    if (i < periodoK - 1) return null;
    const maxVentana = Math.max(...maximos.slice(i - periodoK + 1, i + 1));
    const minVentana = Math.min(...minimos.slice(i - periodoK + 1, i + 1));
    if (maxVentana === minVentana) return 50;
    return ((cierres[i] - minVentana) / (maxVentana - minVentana)) * 100;
  });

  const d: (number | null)[] = k.map((_, i) => {
    if (i < periodoK + periodoD - 2) return null;
    const ventana = k.slice(i - periodoD + 1, i + 1).filter((v): v is number => v !== null);
    if (ventana.length < periodoD) return null;
    return ventana.reduce((a, b) => a + b, 0) / periodoD;
  });

  return { k, d };
}

export function calcularVWAP(maximos: number[], minimos: number[], cierres: number[], volumenes: number[]): (number | null)[] {
  let sumaVolPrecio = 0;
  let sumaVol = 0;
  return cierres.map((c, i) => {
    const tipico = (maximos[i] + minimos[i] + c) / 3;
    const vol = volumenes[i] || 0;
    sumaVolPrecio += tipico * vol;
    sumaVol += vol;
    if (sumaVol === 0) return null;
    return sumaVolPrecio / sumaVol;
  });
}

export interface IndicadorInfo {
  key: string;
  label: string;
  hint: string;
  color: string;
  tipo: "overlay" | "oscilador";
}

export const INDICADORES_DISPONIBLES: IndicadorInfo[] = [
  {
    key: "sma5",
    label: "Media móvil (5)",
    hint: "Promedio del precio de los últimos 5 días. Reacciona rápido a los cambios recientes.",
    color: "#ff6600",
    tipo: "overlay",
  },
  {
    key: "sma10",
    label: "Media móvil (10)",
    hint: "Promedio de los últimos 10 días. Suaviza el ruido de corto plazo.",
    color: "#0077b6",
    tipo: "overlay",
  },
  {
    key: "sma20",
    label: "Media móvil (20)",
    hint: "Promedio de los últimos 20 días. Útil para ver la tendencia de mediano plazo.",
    color: "#6d28d9",
    tipo: "overlay",
  },
  {
    key: "ema9",
    label: "Media exponencial (9)",
    hint: "Media móvil exponencial de 9 días. Da más peso a los precios recientes.",
    color: "#0fa3a3",
    tipo: "overlay",
  },
  {
    key: "ema21",
    label: "Media exponencial (21)",
    hint: "Media móvil exponencial de 21 días, usada para detectar tendencia de mediano plazo.",
    color: "#a3650f",
    tipo: "overlay",
  },
  {
    key: "bollinger",
    label: "Bandas de Bollinger (20,2)",
    hint: "Bandas alrededor del precio según su volatilidad reciente. El precio tiende a moverse dentro de ellas.",
    color: "#0077b6",
    tipo: "overlay",
  },
  {
    key: "vwap",
    label: "VWAP",
    hint: "Precio promedio ponderado por volumen. Usado por traders institucionales como referencia de valor justo.",
    color: "#cc8800",
    tipo: "overlay",
  },
  {
    key: "rsi",
    label: "RSI (14)",
    hint: "Mide si el activo está sobrecomprado (>70) o sobrevendido (<30) en los últimos 14 días.",
    color: "#cc1a1a",
    tipo: "oscilador",
  },
  {
    key: "macd",
    label: "MACD (12,26,9)",
    hint: "Mide el momentum comparando dos medias exponenciales. Cruces de la señal anticipan cambios de tendencia.",
    color: "#0077b6",
    tipo: "oscilador",
  },
  {
    key: "estocastico",
    label: "Estocástico (14,3)",
    hint: "Compara el cierre con el rango reciente de precios para detectar sobrecompra/sobreventa.",
    color: "#6d28d9",
    tipo: "oscilador",
  },
];
