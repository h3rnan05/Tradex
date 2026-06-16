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

interface Destacado {
  ticker: string;
  precio: string;
  cambio_porcentaje: number;
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

export default function ProChart({
  ticker,
  noticias = [],
  precio,
  cambioPorcentaje,
  destacados = [],
  onSeleccionarTicker,
}: {
  ticker: string;
  noticias?: Noticia[];
  precio?: string | null;
  cambioPorcentaje?: number | null;
  destacados?: Destacado[];
  onSeleccionarTicker?: (ticker: string) => void;
}) {
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
  const [menuIndicadoresAbierto, setMenuIndicadoresAbierto] = useState(false);
  const menuIndicadoresRef = useRef<HTMLDivElement>(null);

  function alternarIndicador(key: string) {
    setIndicadoresActivos((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  useEffect(() => {
    if (!menuIndicadoresAbierto) return;
    function alClicAfuera(e: MouseEvent) {
      if (menuIndicadoresRef.current && !menuIndicadoresRef.current.contains(e.target as Node)) {
        setMenuIndicadoresAbierto(false);
      }
    }
    document.addEventListener("mousedown", alClicAfuera);
    return () => document.removeEventListener("mousedown", alClicAfuera);
  }, [menuIndicadoresAbierto]);

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
        panes: {
          separatorColor: "rgba(26,14,0,0.12)",
          separatorHoverColor: "rgba(255,102,0,0.15)",
          enableResize: true,
        },
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
    chart.panes()[0].setStretchFactor(4);

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
      chart.panes()[0].setStretchFactor(4);
      chart.panes()[1].setStretchFactor(1.3);
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
    } else if (chart.panes().length > 1) {
      chart.removePane(1);
    }

    chart.timeScale().fitContent();
  }, [datos, tipo, indicadoresActivos, pantallaCompleta]);

  const subiendo = (cambioPorcentaje ?? 0) >= 0;
  const indicadoresActivosInfo = INDICADORES_DISPONIBLES.filter((i) => indicadoresActivos.includes(i.key));

  return (
    <div
      className={
        pantallaCompleta
          ? "fixed inset-0 z-50 flex bg-canvas"
          : "rounded-md border border-fg/10 bg-canvas shadow-sm"
      }
    >
      {pantallaCompleta && (
        <div className="hidden w-56 shrink-0 flex-col overflow-y-auto border-r border-fg/10 lg:flex">
          <p className="border-b border-fg/10 px-3 py-2.5 font-mono text-[11px] uppercase tracking-widest text-fg/40">
            Watchlist
          </p>
          {destacados.map((d) => {
            const sube = d.cambio_porcentaje >= 0;
            const activo = ticker === d.ticker;
            return (
              <button
                key={d.ticker}
                onClick={() => onSeleccionarTicker?.(d.ticker)}
                className={`flex items-center justify-between border-b border-fg/5 px-3 py-2 text-left ${
                  activo ? "bg-accent/10" : "hover:bg-fg/5"
                }`}
              >
                <span className="font-mono text-xs font-bold text-fg">{d.ticker}</span>
                <span
                  className={`font-mono text-[11px] font-semibold tabular-nums ${
                    sube ? "text-ganancia" : "text-perdida"
                  }`}
                >
                  {sube ? "▲" : "▼"} {d.cambio_porcentaje.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3 border-b border-fg/10 pb-2">
          <div className="flex items-baseline gap-2">
            <p className="font-mono text-sm font-bold tracking-wide text-fg">{ticker.toUpperCase()}</p>
            {precio && (
              <p className="font-mono text-lg font-bold tabular-nums text-fg">${Number(precio).toFixed(2)}</p>
            )}
            {cambioPorcentaje != null && (
              <span
                className={`rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                  subiendo ? "bg-ganancia/10 text-ganancia" : "bg-perdida/10 text-perdida"
                }`}
              >
                {subiendo ? "▲" : "▼"} {subiendo ? "+" : ""}
                {cambioPorcentaje.toFixed(2)}%
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-0.5 rounded-md border border-fg/15 p-0.5">
              {RANGOS.map((r) => (
                <button
                  key={r.label}
                  onClick={() => setDias(r.dias)}
                  className={`rounded-sm px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide transition ${
                    dias === r.dias ? "bg-accent text-white" : "text-fg/50 hover:bg-fg/5"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex gap-0.5 rounded-md border border-fg/15 p-0.5">
              <button
                onClick={() => setTipo("area")}
                className={`rounded-sm px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide transition ${
                  tipo === "area" ? "bg-accent text-white" : "text-fg/50 hover:bg-fg/5"
                }`}
              >
                Línea
              </button>
              <button
                onClick={() => setTipo("velas")}
                className={`rounded-sm px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide transition ${
                  tipo === "velas" ? "bg-accent text-white" : "text-fg/50 hover:bg-fg/5"
                }`}
              >
                Velas
              </button>
            </div>

            <div ref={menuIndicadoresRef} className="relative">
              <button
                onClick={() => setMenuIndicadoresAbierto((v) => !v)}
                className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide transition ${
                  menuIndicadoresAbierto || indicadoresActivos.length > 0
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-fg/15 text-fg/50 hover:bg-fg/5"
                }`}
              >
                Indicadores {indicadoresActivos.length > 0 ? `(${indicadoresActivos.length})` : ""} ▾
              </button>
              {menuIndicadoresAbierto && (
                <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-md border border-fg/15 bg-panel p-2 shadow-lg">
                  {INDICADORES_DISPONIBLES.map((ind) => (
                    <label
                      key={ind.key}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 hover:bg-fg/5"
                    >
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ind.color }} />
                        <span className="text-xs font-medium text-fg">{ind.label}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={indicadoresActivos.includes(ind.key)}
                        onChange={() => alternarIndicador(ind.key)}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setPantallaCompleta((v) => !v)}
              className="rounded-md border border-fg/15 px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-fg/50 transition hover:bg-fg/5"
            >
              {pantallaCompleta ? "Cerrar ✕" : "Pantalla completa ⛶"}
            </button>
          </div>
        </div>

        {indicadoresActivosInfo.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-3">
            {indicadoresActivosInfo.map((ind) => (
              <span key={ind.key} className="flex items-center gap-1.5 font-mono text-[10px] text-fg/50">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ind.color }} />
                {ind.label}
              </span>
            ))}
          </div>
        )}

        {cargando && <p className="text-sm text-fg/40">Cargando gráfica...</p>}
        {error && <p className="text-sm text-perdida">{error}</p>}

        <div ref={contenedorRef} className={pantallaCompleta ? "min-h-0 flex-1" : "h-[440px] w-full"} />
      </div>

      {pantallaCompleta && (
        <div className="hidden w-80 shrink-0 overflow-y-auto border-l border-fg/10 p-4 lg:block">
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
