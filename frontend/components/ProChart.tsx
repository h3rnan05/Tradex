"use client";

import { useEffect, useRef, useState } from "react";
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  LineSeries,
  createChart,
} from "lightweight-charts";
import { api } from "@/lib/api";
import { INDICADORES_DISPONIBLES, calcularRSI, calcularSMA } from "@/lib/indicadores";

interface PuntoHistorial {
  fecha: string;
  precio: string;
  apertura: string | null;
  maximo: string | null;
  minimo: string | null;
  volumen: number | null;
}

interface HistorialResponse {
  ticker: string;
  historial: PuntoHistorial[];
}

interface Noticia {
  titulo: string;
  fuente: string;
  link: string;
  fecha: string | null;
}

const RANGOS: { label: string; dias: number }[] = [
  { label: "5D", dias: 5 },
  { label: "1M", dias: 30 },
  { label: "6M", dias: 182 },
  { label: "1A", dias: 365 },
  { label: "5A", dias: 1825 },
];

const COLOR_SUBE = "#007a2e";
const COLOR_BAJA = "#cc1a1a";
const COLOR_FONDO = "#faf6ed";
const COLOR_TEXTO = "rgba(26,14,0,0.55)";
const COLOR_GRID = "rgba(26,14,0,0.06)";

export default function ProChart({ ticker, noticias = [] }: { ticker: string; noticias?: Noticia[] }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const serieVelasRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const serieAreaRef = useRef<ISeriesApi<"Area"> | null>(null);
  const serieVolumenRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const seriesSmaRef = useRef<Record<string, ISeriesApi<"Line">>>({});
  const serieRsiRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [dias, setDias] = useState(30);
  const [tipo, setTipo] = useState<"area" | "velas">("area");
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [datos, setDatos] = useState<PuntoHistorial[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [indicadoresActivos, setIndicadoresActivos] = useState<string[]>(["sma5"]);

  function alternarIndicador(key: string) {
    setIndicadoresActivos((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  useEffect(() => {
    if (!ticker) return;
    setCargando(true);
    setError(null);
    api
      .get<HistorialResponse>(`/precios/${ticker}/historial?dias=${dias}`)
      .then((r) => setDatos(r.historial))
      .catch(() => setError("No se pudo cargar el historial"))
      .finally(() => setCargando(false));
  }, [ticker, dias]);

  useEffect(() => {
    if (!contenedorRef.current) return;

    const chart = createChart(contenedorRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: COLOR_FONDO },
        textColor: COLOR_TEXTO,
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: COLOR_GRID },
        horzLines: { color: COLOR_GRID },
      },
      rightPriceScale: { borderColor: "rgba(26,14,0,0.15)" },
      timeScale: { borderColor: "rgba(26,14,0,0.15)", timeVisible: false },
      crosshair: {
        vertLine: { color: "rgba(26,14,0,0.3)", labelBackgroundColor: "#1a0e00" },
        horzLine: { color: "rgba(26,14,0,0.3)", labelBackgroundColor: "#1a0e00" },
      },
      handleScroll: true,
      handleScale: true,
    });
    chartRef.current = chart;

    const resize = () => {
      if (contenedorRef.current) {
        chart.applyOptions({
          width: contenedorRef.current.clientWidth,
          height: contenedorRef.current.clientHeight,
        });
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(contenedorRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      serieVelasRef.current = null;
      serieAreaRef.current = null;
      serieVolumenRef.current = null;
      seriesSmaRef.current = {};
      serieRsiRef.current = null;
    };
  }, [pantallaCompleta]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || datos.length === 0) return;

    if (serieVelasRef.current) {
      chart.removeSeries(serieVelasRef.current);
      serieVelasRef.current = null;
    }
    if (serieAreaRef.current) {
      chart.removeSeries(serieAreaRef.current);
      serieAreaRef.current = null;
    }
    if (serieVolumenRef.current) {
      chart.removeSeries(serieVolumenRef.current);
      serieVolumenRef.current = null;
    }
    Object.values(seriesSmaRef.current).forEach((s) => chart.removeSeries(s));
    seriesSmaRef.current = {};
    if (serieRsiRef.current) {
      chart.removeSeries(serieRsiRef.current);
      serieRsiRef.current = null;
    }

    const ultimoCierre = Number(datos[datos.length - 1].precio);
    const primerCierre = Number(datos[0].precio);
    const colorTendencia = ultimoCierre >= primerCierre ? COLOR_SUBE : COLOR_BAJA;

    if (tipo === "velas") {
      const serie = chart.addSeries(CandlestickSeries, {
        upColor: COLOR_SUBE,
        downColor: COLOR_BAJA,
        borderVisible: false,
        wickUpColor: COLOR_SUBE,
        wickDownColor: COLOR_BAJA,
      });
      serie.setData(
        datos
          .filter((d) => d.apertura !== null && d.maximo !== null && d.minimo !== null)
          .map((d) => ({
            time: d.fecha,
            open: Number(d.apertura),
            high: Number(d.maximo),
            low: Number(d.minimo),
            close: Number(d.precio),
          }))
      );
      serieVelasRef.current = serie;
    } else {
      const serie = chart.addSeries(AreaSeries, {
        lineColor: colorTendencia,
        topColor: `${colorTendencia}55`,
        bottomColor: `${colorTendencia}00`,
        lineWidth: 2,
      });
      serie.setData(datos.map((d) => ({ time: d.fecha, value: Number(d.precio) })));
      serieAreaRef.current = serie;
    }

    const hayVolumen = datos.some((d) => d.volumen !== null && d.volumen !== undefined);
    if (hayVolumen) {
      const serieVol = chart.addSeries(HistogramSeries, {
        color: `${colorTendencia}66`,
        priceFormat: { type: "volume" },
        priceScaleId: "volumen",
      });
      serieVol.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      serieVol.setData(
        datos
          .filter((d) => d.volumen !== null && d.volumen !== undefined)
          .map((d) => ({ time: d.fecha, value: d.volumen as number }))
      );
      serieVolumenRef.current = serieVol;
    }

    const precios = datos.map((d) => Number(d.precio));
    const periodos: Record<string, number> = { sma5: 5, sma10: 10, sma20: 20 };
    for (const [key, periodo] of Object.entries(periodos)) {
      if (!indicadoresActivos.includes(key)) continue;
      const valores = calcularSMA(precios, periodo);
      const color = INDICADORES_DISPONIBLES.find((i) => i.key === key)?.color ?? "#888";
      const serieSma = chart.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      serieSma.setData(
        datos
          .map((d, i) => ({ time: d.fecha, value: valores[i] }))
          .filter((p): p is { time: string; value: number } => p.value !== null)
      );
      seriesSmaRef.current[key] = serieSma;
    }

    if (indicadoresActivos.includes("rsi")) {
      const valoresRsi = calcularRSI(precios, 14);
      if (chart.panes().length < 2) chart.addPane();
      const serieRsi = chart.addSeries(
        LineSeries,
        { color: "#cc1a1a", lineWidth: 2 },
        1
      );
      serieRsi.setData(
        datos
          .map((d, i) => ({ time: d.fecha, value: valoresRsi[i] }))
          .filter((p): p is { time: string; value: number } => p.value !== null)
      );
      serieRsi.createPriceLine({ price: 70, color: "rgba(204,26,26,0.5)", lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: "70" });
      serieRsi.createPriceLine({ price: 30, color: "rgba(0,122,46,0.5)", lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: "30" });
      serieRsiRef.current = serieRsi;
    }

    chart.timeScale().fitContent();
  }, [datos, tipo, indicadoresActivos, pantallaCompleta]);

  return (
    <div
      className={
        pantallaCompleta
          ? "fixed inset-0 z-50 flex bg-canvas p-4"
          : "rounded-sm border border-fg/10 bg-canvas p-3 shadow-sm"
      }
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1">
            {RANGOS.map((r) => (
              <button
                key={r.label}
                onClick={() => setDias(r.dias)}
                className={`rounded-none border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide transition ${
                  dias === r.dias
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-fg/15 text-fg/50 hover:bg-fg/5"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setTipo("area")}
              className={`rounded-none border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide transition ${
                tipo === "area" ? "border-accent bg-accent/10 text-accent" : "border-fg/15 text-fg/50 hover:bg-fg/5"
              }`}
            >
              Línea
            </button>
            <button
              onClick={() => setTipo("velas")}
              className={`rounded-none border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide transition ${
                tipo === "velas" ? "border-accent bg-accent/10 text-accent" : "border-fg/15 text-fg/50 hover:bg-fg/5"
              }`}
            >
              Velas
            </button>
            <button
              onClick={() => setPantallaCompleta((v) => !v)}
              className="rounded-none border border-fg/15 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-fg/50 transition hover:bg-fg/5"
            >
              {pantallaCompleta ? "Cerrar ✕" : "Pantalla completa ⛶"}
            </button>
          </div>
        </div>

        {cargando && <p className="text-sm text-fg/40">Cargando gráfica...</p>}
        {error && <p className="text-sm text-perdida">{error}</p>}

        <div ref={contenedorRef} className={pantallaCompleta ? "min-h-0 flex-1" : "h-[420px] w-full"} />

        <div className="mt-2 flex flex-wrap gap-3 border-t border-fg/10 pt-2">
          {INDICADORES_DISPONIBLES.map((ind) => (
            <label key={ind.key} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={indicadoresActivos.includes(ind.key)}
                onChange={() => alternarIndicador(ind.key)}
              />
              <span className="font-mono font-medium" style={{ color: ind.color }}>
                {ind.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {pantallaCompleta && (
        <div className="ml-4 hidden w-80 shrink-0 overflow-y-auto border-l border-fg/10 pl-4 lg:block">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">Noticias · {ticker}</p>
          <div className="flex flex-col gap-3">
            {noticias.map((n, i) => (
              <a
                key={i}
                href={n.link}
                target="_blank"
                rel="noreferrer"
                className="block border-b border-fg/10 pb-3 text-sm hover:text-accent"
              >
                <p className="font-medium text-fg">{n.titulo}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-fg/40">
                  {n.fuente} {n.fecha ? `· ${new Date(n.fecha).toLocaleDateString()}` : ""}
                </p>
              </a>
            ))}
            {noticias.length === 0 && <p className="text-sm text-fg/40">Sin noticias recientes.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
