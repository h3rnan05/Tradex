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
  MouseEventParams,
  Time,
  createChart,
} from "lightweight-charts";
import { api } from "@/lib/api";
import {
  INDICADORES_DISPONIBLES,
  calcularBandasBollinger,
  calcularEMA,
  calcularEstocastico,
  calcularMACD,
  calcularRSI,
  calcularSMA,
  calcularVWAP,
} from "@/lib/indicadores";

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

const COLOR_SUBE = "#22c55e";
const COLOR_BAJA = "#ef4444";
const COLOR_FONDO_LIGHT = "#faf6ed";
const COLOR_TEXTO_LIGHT = "rgba(26,14,0,0.55)";
const COLOR_GRID_LIGHT = "rgba(26,14,0,0.06)";
const COLOR_FONDO_DARK = "#0d0d0d";
const COLOR_TEXTO_DARK = "rgba(220,220,220,0.85)";
const COLOR_GRID_DARK = "rgba(255,255,255,0.05)";

export default function ProChart({
  ticker,
  noticias = [],
  precio,
  cambioPorcentaje,
  destacados = [],
  onSeleccionarTicker,
  dark = false,
}: {
  ticker: string;
  noticias?: Noticia[];
  precio?: string | null;
  cambioPorcentaje?: number | null;
  destacados?: Destacado[];
  onSeleccionarTicker?: (ticker: string) => void;
  dark?: boolean;
}) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const serieVelasRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const serieAreaRef = useRef<ISeriesApi<"Area"> | null>(null);
  const serieVolumenRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlaySeriesRef = useRef<Record<string, ISeriesApi<"Line">[]>>({});
  const trendLinesRef = useRef<ISeriesApi<"Line">[]>([]);
  const puntoInicioTrazoRef = useRef<{ time: Time; value: number; paneIndex: number } | null>(null);

  const [dias, setDias] = useState(30);
  const [tipo, setTipo] = useState<"area" | "velas">("area");
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [datos, setDatos] = useState<PuntoHistorial[]>([]);
  const [datosCompletos, setDatosCompletos] = useState<PuntoHistorial[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [indicadoresActivos, setIndicadoresActivos] = useState<string[]>(["sma5"]);
  const [menuIndicadoresAbierto, setMenuIndicadoresAbierto] = useState(false);
  const [dibujando, setDibujando] = useState(false);
  const [numTrazos, setNumTrazos] = useState(0);
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
    const diasConsulta = Math.min(1825, dias + 60);
    api
      .get<HistorialResponse>(`/precios/${ticker}/historial?dias=${diasConsulta}`)
      .then((r) => {
        const diasHabilesObjetivo = Math.max(1, Math.round((dias * 5) / 7));
        setDatosCompletos(r.historial);
        setDatos(
          r.historial.length > diasHabilesObjetivo ? r.historial.slice(-diasHabilesObjetivo) : r.historial
        );
      })
      .catch(() => setError("No se pudo cargar el historial"))
      .finally(() => setCargando(false));
  }, [ticker, dias]);

  useEffect(() => {
    if (!contenedorRef.current) return;

    const fondo = dark ? COLOR_FONDO_DARK : COLOR_FONDO_LIGHT;
    const texto = dark ? COLOR_TEXTO_DARK : COLOR_TEXTO_LIGHT;
    const grid = dark ? COLOR_GRID_DARK : COLOR_GRID_LIGHT;
    const borde = dark ? "rgba(255,255,255,0.08)" : "rgba(26,14,0,0.15)";
    const crosshairColor = dark ? "rgba(255,255,255,0.25)" : "rgba(26,14,0,0.3)";
    const crosshairBg = dark ? "#1e1e1e" : "#1a0e00";
    const sepColor = dark ? "rgba(255,255,255,0.06)" : "rgba(26,14,0,0.12)";
    const sepHover = dark ? "rgba(255,158,27,0.2)" : "rgba(255,102,0,0.15)";

    const chart = createChart(contenedorRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: fondo },
        textColor: texto,
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: 11,
        panes: {
          separatorColor: sepColor,
          separatorHoverColor: sepHover,
          enableResize: true,
        },
      },
      grid: {
        vertLines: { color: grid },
        horzLines: { color: grid },
      },
      rightPriceScale: { borderColor: borde },
      timeScale: { borderColor: borde, timeVisible: false },
      crosshair: {
        vertLine: { color: crosshairColor, labelBackgroundColor: crosshairBg },
        horzLine: { color: crosshairColor, labelBackgroundColor: crosshairBg },
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
      overlaySeriesRef.current = {};
      trendLinesRef.current = [];
      puntoInicioTrazoRef.current = null;
      setNumTrazos(0);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pantallaCompleta, dark]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !dibujando) return;

    function alClicEnGrafico(param: MouseEventParams) {
      if (!param.point || param.time === undefined || param.paneIndex === undefined) return;
      const pane = chart!.panes()[param.paneIndex];
      if (!pane) return;
      const seriesEnPane = pane.getSeries();
      if (seriesEnPane.length === 0) return;
      const valor = seriesEnPane[0].coordinateToPrice(param.point.y);
      if (valor === null) return;

      if (!puntoInicioTrazoRef.current) {
        puntoInicioTrazoRef.current = { time: param.time as Time, value: valor, paneIndex: param.paneIndex };
        return;
      }

      if (puntoInicioTrazoRef.current.paneIndex !== param.paneIndex) {
        puntoInicioTrazoRef.current = { time: param.time as Time, value: valor, paneIndex: param.paneIndex };
        return;
      }

      const linea = chart!.addSeries(
        LineSeries,
        {
          color: "#ff6600",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        },
        param.paneIndex
      );
      linea.setData([
        { time: puntoInicioTrazoRef.current.time, value: puntoInicioTrazoRef.current.value },
        { time: param.time as Time, value: valor },
      ]);
      trendLinesRef.current.push(linea);
      puntoInicioTrazoRef.current = null;
      setNumTrazos(trendLinesRef.current.length);
    }

    chart.subscribeClick(alClicEnGrafico);
    return () => {
      chart.unsubscribeClick(alClicEnGrafico);
      puntoInicioTrazoRef.current = null;
    };
  }, [dibujando]);

  function borrarTrazos() {
    const chart = chartRef.current;
    if (!chart) return;
    trendLinesRef.current.forEach((s) => chart.removeSeries(s));
    trendLinesRef.current = [];
    puntoInicioTrazoRef.current = null;
    setNumTrazos(0);
  }

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
    Object.values(overlaySeriesRef.current).forEach((series) => series.forEach((s) => chart.removeSeries(s)));
    overlaySeriesRef.current = {};
    while (chart.panes().length > 1) chart.removePane(chart.panes().length - 1);

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

    const fechas = datos.map((d) => d.fecha);

    const baseIndicadores = datosCompletos.length >= datos.length ? datosCompletos : datos;
    const preciosCompletos = baseIndicadores.map((d) => Number(d.precio));
    const maximosCompletos = baseIndicadores.map((d) => Number(d.maximo ?? d.precio));
    const minimosCompletos = baseIndicadores.map((d) => Number(d.minimo ?? d.precio));
    const volumenesCompletos = baseIndicadores.map((d) => d.volumen ?? 0);

    function recortarVisible<T>(valores: T[]): T[] {
      return valores.slice(valores.length - fechas.length);
    }

    function lineaSimple(valoresCompletos: (number | null)[], color: string, ancho: 1 | 2 = 1) {
      const valores = recortarVisible(valoresCompletos);
      const serie = chart!.addSeries(LineSeries, {
        color,
        lineWidth: ancho,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      serie.setData(
        fechas
          .map((time, i) => ({ time, value: valores[i] }))
          .filter((p): p is { time: string; value: number } => p.value !== null)
      );
      return serie;
    }

    const periodosSma: Record<string, number> = { sma5: 5, sma10: 10, sma20: 20 };
    for (const [key, periodo] of Object.entries(periodosSma)) {
      if (!indicadoresActivos.includes(key)) continue;
      const color = INDICADORES_DISPONIBLES.find((i) => i.key === key)?.color ?? "#888";
      overlaySeriesRef.current[key] = [lineaSimple(calcularSMA(preciosCompletos, periodo), color)];
    }

    const periodosEma: Record<string, number> = { ema9: 9, ema21: 21 };
    for (const [key, periodo] of Object.entries(periodosEma)) {
      if (!indicadoresActivos.includes(key)) continue;
      const color = INDICADORES_DISPONIBLES.find((i) => i.key === key)?.color ?? "#888";
      overlaySeriesRef.current[key] = [lineaSimple(calcularEMA(preciosCompletos, periodo), color)];
    }

    if (indicadoresActivos.includes("bollinger")) {
      const { superior, media, inferior } = calcularBandasBollinger(preciosCompletos, 20, 2);
      const color = INDICADORES_DISPONIBLES.find((i) => i.key === "bollinger")?.color ?? "#0077b6";
      overlaySeriesRef.current["bollinger"] = [
        lineaSimple(superior, `${color}aa`),
        lineaSimple(media, color),
        lineaSimple(inferior, `${color}aa`),
      ];
    }

    if (indicadoresActivos.includes("vwap")) {
      const color = INDICADORES_DISPONIBLES.find((i) => i.key === "vwap")?.color ?? "#cc8800";
      overlaySeriesRef.current["vwap"] = [
        lineaSimple(calcularVWAP(maximosCompletos, minimosCompletos, preciosCompletos, volumenesCompletos), color, 2),
      ];
    }

    const osciladoresActivos = ["rsi", "macd", "estocastico"].filter((k) => indicadoresActivos.includes(k));
    chart.panes()[0].setStretchFactor(osciladoresActivos.length > 0 ? 4 : 1);

    osciladoresActivos.forEach((key, idx) => {
      const paneIndex = idx + 1;
      chart.addPane();
      chart.panes()[paneIndex].setStretchFactor(1.3);

      if (key === "rsi") {
        const valoresRsi = recortarVisible(calcularRSI(preciosCompletos, 14));
        const serieRsi = chart.addSeries(LineSeries, { color: "#cc1a1a", lineWidth: 2 }, paneIndex);
        serieRsi.setData(
          fechas
            .map((time, i) => ({ time, value: valoresRsi[i] }))
            .filter((p): p is { time: string; value: number } => p.value !== null)
        );
        serieRsi.createPriceLine({ price: 70, color: "rgba(204,26,26,0.5)", lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: "70" });
        serieRsi.createPriceLine({ price: 30, color: "rgba(0,122,46,0.5)", lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: "30" });
      }

      if (key === "macd") {
        const macdCompleto = calcularMACD(preciosCompletos, 12, 26, 9);
        const macd = recortarVisible(macdCompleto.macd);
        const señal = recortarVisible(macdCompleto.señal);
        const histograma = recortarVisible(macdCompleto.histograma);
        const serieHist = chart.addSeries(HistogramSeries, { priceFormat: { type: "price", precision: 2 } }, paneIndex);
        serieHist.setData(
          fechas
            .map((time, i) => ({ time, value: histograma[i], color: (histograma[i] ?? 0) >= 0 ? `${COLOR_SUBE}66` : `${COLOR_BAJA}66` }))
            .filter((p): p is { time: string; value: number; color: string } => p.value !== null)
        );
        const serieMacd = chart.addSeries(LineSeries, { color: "#0077b6", lineWidth: 2 }, paneIndex);
        serieMacd.setData(
          fechas
            .map((time, i) => ({ time, value: macd[i] }))
            .filter((p): p is { time: string; value: number } => p.value !== null)
        );
        const serieSeñal = chart.addSeries(LineSeries, { color: "#cc1a1a", lineWidth: 1 }, paneIndex);
        serieSeñal.setData(
          fechas
            .map((time, i) => ({ time, value: señal[i] }))
            .filter((p): p is { time: string; value: number } => p.value !== null)
        );
      }

      if (key === "estocastico") {
        const estCompleto = calcularEstocastico(maximosCompletos, minimosCompletos, preciosCompletos, 14, 3);
        const k = recortarVisible(estCompleto.k);
        const d = recortarVisible(estCompleto.d);
        const serieK = chart.addSeries(LineSeries, { color: "#6d28d9", lineWidth: 2 }, paneIndex);
        serieK.setData(
          fechas
            .map((time, i) => ({ time, value: k[i] }))
            .filter((p): p is { time: string; value: number } => p.value !== null)
        );
        const serieD = chart.addSeries(LineSeries, { color: "#ff6600", lineWidth: 1 }, paneIndex);
        serieD.setData(
          fechas
            .map((time, i) => ({ time, value: d[i] }))
            .filter((p): p is { time: string; value: number } => p.value !== null)
        );
        serieK.createPriceLine({ price: 80, color: "rgba(204,26,26,0.5)", lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: "80" });
        serieK.createPriceLine({ price: 20, color: "rgba(0,122,46,0.5)", lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: "20" });
      }
    });

    chart.timeScale().fitContent();
  }, [datos, datosCompletos, tipo, indicadoresActivos, pantallaCompleta]);

  const subiendo = (cambioPorcentaje ?? 0) >= 0;
  const indicadoresActivosInfo = INDICADORES_DISPONIBLES.filter((i) => indicadoresActivos.includes(i.key));

  // Clases de color adaptadas al tema
  const dk = dark;
  const wrap = dk ? "bg-[#0d0d0d] border-[#1f1f1f]" : "bg-canvas border-fg/10";
  const txt = dk ? "text-[#dcdcdc]" : "text-fg";
  const txt50 = dk ? "text-[#7a7a7a]" : "text-fg/50";
  const border = dk ? "border-[#2a2a2a]" : "border-fg/15";
  const panelBg = dk ? "bg-[#131313]" : "bg-panel";
  const hov = dk ? "hover:bg-[#1a1a1a]" : "hover:bg-fg/5";
  const sep = dk ? "border-[#1f1f1f]" : "border-fg/10";
  const sepLight = dk ? "border-[#191919]" : "border-fg/5";
  const activoBg = dk ? "bg-[#ff9e1b]/10" : "bg-accent/10";
  const btnActive = dk ? "bg-[#ff9e1b] text-black" : "bg-accent text-white";
  const indActive = dk ? "border-[#ff9e1b] bg-[#ff9e1b]/10 text-[#ff9e1b]" : "border-accent bg-accent/10 text-accent";
  const drawActive = dk ? "border-[#ff9e1b] bg-[#ff9e1b]/10 text-[#ff9e1b]" : "border-accent bg-accent/10 text-accent";

  return (
    <div
      className={
        pantallaCompleta
          ? `fixed inset-0 z-50 flex ${dk ? "bg-[#0a0a0a]" : "bg-canvas"}`
          : `rounded-md border ${wrap} shadow-sm`
      }
    >
      {pantallaCompleta && (
        <div className={`hidden w-56 shrink-0 flex-col overflow-y-auto border-r ${sep} lg:flex`}>
          <p className={`border-b ${sep} px-3 py-2.5 font-mono text-[11px] uppercase tracking-widest ${txt50}`}>
            Watchlist
          </p>
          {destacados.map((d) => {
            const sube = d.cambio_porcentaje >= 0;
            const activo = ticker === d.ticker;
            return (
              <button
                key={d.ticker}
                onClick={() => onSeleccionarTicker?.(d.ticker)}
                className={`flex items-center justify-between border-b ${sepLight} px-3 py-2 text-left ${
                  activo ? activoBg : hov
                }`}
              >
                <span className={`font-mono text-xs font-bold ${txt}`}>{d.ticker}</span>
                <span
                  className={`font-mono text-[11px] font-semibold tabular-nums ${
                    sube ? "text-[#22c55e]" : "text-[#ef4444]"
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
        <div className={`mb-2 flex flex-wrap items-center justify-between gap-3 border-b ${sep} pb-2`}>
          <div className="flex items-baseline gap-2">
            <p className={`font-mono text-sm font-bold tracking-wide ${txt}`}>{ticker.toUpperCase()}</p>
            {precio && (
              <p className={`font-mono text-lg font-bold tabular-nums ${txt}`}>${Number(precio).toFixed(2)}</p>
            )}
            {cambioPorcentaje != null && (
              <span
                className={`rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                  subiendo ? "bg-[#22c55e]/15 text-[#22c55e]" : "bg-[#ef4444]/15 text-[#ef4444]"
                }`}
              >
                {subiendo ? "▲" : "▼"} {subiendo ? "+" : ""}
                {cambioPorcentaje.toFixed(2)}%
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex gap-0.5 rounded-md border ${border} p-0.5`}>
              {RANGOS.map((r) => (
                <button
                  key={r.label}
                  onClick={() => setDias(r.dias)}
                  className={`rounded-sm px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide transition ${
                    dias === r.dias ? btnActive : `${txt50} ${hov}`
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className={`flex gap-0.5 rounded-md border ${border} p-0.5`}>
              <button
                onClick={() => setTipo("area")}
                className={`rounded-sm px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide transition ${
                  tipo === "area" ? btnActive : `${txt50} ${hov}`
                }`}
              >
                Línea
              </button>
              <button
                onClick={() => setTipo("velas")}
                className={`rounded-sm px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide transition ${
                  tipo === "velas" ? btnActive : `${txt50} ${hov}`
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
                    ? indActive
                    : `${border} ${txt50} ${hov}`
                }`}
              >
                Indicadores {indicadoresActivos.length > 0 ? `(${indicadoresActivos.length})` : ""} ▾
              </button>
              {menuIndicadoresAbierto && (
                <div className={`absolute right-0 top-full z-10 mt-1 w-56 rounded-md border ${border} ${panelBg} p-2 shadow-lg`}>
                  {INDICADORES_DISPONIBLES.map((ind) => (
                    <label
                      key={ind.key}
                      className={`flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 ${hov}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ind.color }} />
                        <span className={`text-xs font-medium ${txt}`}>{ind.label}</span>
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
              onClick={() => setDibujando((v) => !v)}
              className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide transition ${
                dibujando ? drawActive : `${border} ${txt50} ${hov}`
              }`}
            >
              Dibujar
            </button>
            {numTrazos > 0 && (
              <button
                onClick={borrarTrazos}
                className={`rounded-md border ${border} px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide ${txt50} transition ${hov}`}
              >
                Borrar líneas
              </button>
            )}

            <button
              onClick={() => setPantallaCompleta((v) => !v)}
              className={`rounded-md border ${border} px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide ${txt50} transition ${hov}`}
            >
              {pantallaCompleta ? "Cerrar ✕" : "Pantalla completa"}
            </button>
          </div>
        </div>

        {dibujando && (
          <p className={`mb-2 font-mono text-[11px] ${dk ? "text-[#ff9e1b]" : "text-accent"}`}>
            Modo dibujo activo: haz clic en dos puntos de cualquier panel de la gráfica para trazar una línea.
          </p>
        )}

        {indicadoresActivosInfo.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-3">
            {indicadoresActivosInfo.map((ind) => (
              <span key={ind.key} className={`flex items-center gap-1.5 font-mono text-[10px] ${txt50}`}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ind.color }} />
                {ind.label}
              </span>
            ))}
          </div>
        )}

        {cargando && <p className={`text-sm ${txt50}`}>Cargando gráfica...</p>}
        {error && <p className="text-sm text-[#ef4444]">{error}</p>}

        <div ref={contenedorRef} className={pantallaCompleta ? "min-h-0 flex-1" : "h-[440px] w-full"} />
      </div>

      {pantallaCompleta && (
        <div className={`hidden w-80 shrink-0 overflow-y-auto border-l ${sep} p-4 lg:block`}>
          <p className={`mb-2 font-mono text-[11px] uppercase tracking-widest ${txt50}`}>Noticias · {ticker}</p>
          <div className="flex flex-col gap-3">
            {noticias.map((n, i) => (
              <a
                key={i}
                href={n.link}
                target="_blank"
                rel="noreferrer"
                className={`block border-b ${sep} pb-3 text-sm ${dk ? "hover:text-[#ff9e1b]" : "hover:text-accent"}`}
              >
                <p className={`font-medium ${txt}`}>{n.titulo}</p>
                <p className={`mt-1 font-mono text-[10px] uppercase tracking-wide ${txt50}`}>
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
