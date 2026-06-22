"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import { Badge, Card, StatTile, formatoMoneda, formatoPorcentaje } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { obtenerSesion } from "@/lib/auth";

/** Estado de ánimo del mercado según la caída actual promedio. */
function sentimiento(cambio: number): { label: string; color: string; pos: number } {
  if (cambio <= -10) return { label: "Pánico", color: "#dc2626", pos: 8 };
  if (cambio <= -3) return { label: "Miedo", color: "#ea580c", pos: 28 };
  if (cambio < 0) return { label: "Cautela", color: "#ca8a04", pos: 48 };
  if (cambio < 5) return { label: "Optimismo", color: "#16a34a", pos: 72 };
  return { label: "Euforia", color: "#15803d", pos: 92 };
}

interface RetoOut {
  id: string;
  grupo_id: string;
  escenario_id: string | null;
  activos_permitidos: string[] | null;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  capital_inicial: string;
}

interface RetoHolding {
  ticker: string;
  cantidad: string;
  precio_promedio: string;
  precio_actual: string;
  valor_mercado: string;
}

interface RetoEstado {
  reto: RetoOut;
  capital_disponible: string;
  holdings: RetoHolding[];
  valor_total: string;
  prestamo_total?: string;
  rendimiento_porcentaje: string;
  progreso_porcentaje: number;
}

interface Escenario {
  id: string;
  nombre: string;
  descripcion: string;
  tickers_sugeridos: string[];
}

interface RankingEntry {
  alumno_id: string;
  nombre: string;
  valor_total: string;
  rendimiento_porcentaje: string;
}

interface RetoOrden {
  id: string;
  ticker: string;
  tipo: "compra" | "venta";
  cantidad: string;
  precio_ejecucion: string;
  timestamp: string;
}

interface MercadoEntry {
  ticker: string;
  precio: string;
  cambio_porcentaje: number;
  cambio_total: number;
}

interface Noticia {
  fecha: string;
  titular: string;
  cuerpo: string;
}

interface NoticiasResp {
  periodico: string;
  noticias: Noticia[];
}

function limpiar(t: string) {
  return t.replace("-USD", "").replace("=X", "").replace(".MX", "");
}

/** Mini-gráfica de línea (SVG) que revela la curva del precio en el reto. */
function MiniGrafica({ serie, baja }: { serie: number[]; baja: boolean }) {
  if (serie.length < 2) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-[10px] text-fg/30">
        Esperando datos del mercado…
      </div>
    );
  }
  const w = 300;
  const h = 90;
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const rango = max - min || 1;
  const px = (i: number) => (i / (serie.length - 1)) * w;
  const py = (v: number) => h - 4 - ((v - min) / rango) * (h - 8);
  const linea = serie.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const area = `0,${h} ${linea} ${w},${h}`;
  const colorClase = baja ? "text-perdida" : "text-ganancia";
  const ultimoX = px(serie.length - 1);
  const ultimoY = py(serie[serie.length - 1]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={`h-full w-full ${colorClase}`}>
      <polygon points={area} fill="currentColor" opacity={0.08} />
      <polyline points={linea} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <circle cx={ultimoX} cy={ultimoY} r={3} fill="currentColor" />
    </svg>
  );
}

export default function RetoActivo({ retoId }: { retoId: string }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const fondoAvisado = useRef(false);
  const [estado, setEstado] = useState<RetoEstado | null>(null);
  const [escenario, setEscenario] = useState<Escenario | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [ordenes, setOrdenes] = useState<RetoOrden[]>([]);
  const [mercado, setMercado] = useState<MercadoEntry[]>([]);
  const [noticias, setNoticias] = useState<NoticiasResp | null>(null);
  const [serie, setSerie] = useState<number[]>([]);
  const [ticker, setTicker] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const [apalancamiento, setApalancamiento] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [operando, setOperando] = useState(false);

  async function cargarEstado() {
    try {
      setEstado(await api.get<RetoEstado>(`/retos/${retoId}/estado`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("challenge.errorLoad"));
    }
  }
  function cargarRanking() {
    api.get<RankingEntry[]>(`/retos/${retoId}/ranking`).then(setRanking).catch(() => {});
  }
  function cargarOrdenes() {
    api.get<RetoOrden[]>(`/retos/${retoId}/ordenes`).then(setOrdenes).catch(() => {});
  }
  function cargarMercado() {
    api.get<MercadoEntry[]>(`/retos/${retoId}/mercado`).then(setMercado).catch(() => {});
  }
  function cargarNoticias() {
    api.get<NoticiasResp>(`/retos/${retoId}/noticias`).then(setNoticias).catch(() => {});
  }

  useEffect(() => {
    cargarEstado();
    cargarRanking();
    cargarOrdenes();
    cargarMercado();
    cargarNoticias();
    const interval = setInterval(() => {
      cargarEstado();
      cargarRanking();
      cargarMercado();
      cargarNoticias();
    }, 5000);
    return () => clearInterval(interval);
  }, [retoId]);

  // Serie de precio del activo seleccionado, revelándose en vivo.
  useEffect(() => {
    if (!ticker || !estado?.reto.escenario_id) {
      setSerie([]);
      return;
    }
    const cargar = () =>
      api
        .get<number[]>(`/retos/${retoId}/serie?ticker=${encodeURIComponent(ticker)}`)
        .then(setSerie)
        .catch(() => {});
    cargar();
    const iv = setInterval(cargar, 5000);
    return () => clearInterval(iv);
  }, [ticker, retoId, estado?.reto.escenario_id]);

  useEffect(() => {
    if (!estado?.reto.escenario_id) return;
    api
      .get<Escenario[]>("/precios/escenarios")
      .then((lista) => setEscenario(lista.find((e) => e.id === estado.reto.escenario_id) ?? null))
      .catch(() => {});
  }, [estado?.reto.escenario_id]);

  // Aviso único cuando el mercado toca fondo (señal para cubrir cortos / comprar).
  useEffect(() => {
    if (!estado?.reto.escenario_id || mercado.length === 0 || fondoAvisado.current) return;
    const totalProm = mercado.reduce((a, m) => a + m.cambio_total, 0) / mercado.length;
    const actualProm = mercado.reduce((a, m) => a + m.cambio_porcentaje, 0) / mercado.length;
    // Llegamos al ~90% de la caída proyectada y el reto pasó la mitad: es el fondo.
    if (totalProm < -1 && actualProm <= totalProm * 0.9 && estado.progreso_porcentaje >= 45) {
      fondoAvisado.current = true;
      toast(t("challenge.bottomAlert"), "info");
    }
  }, [mercado, estado?.progreso_porcentaje, estado?.reto.escenario_id, t, toast]);

  const activosReto = estado?.reto.activos_permitidos ?? [];
  const tickersOperables = activosReto.length > 0 ? activosReto : escenario?.tickers_sugeridos ?? [];

  // Precio actual del ticker seleccionado (del feed de mercado del reto).
  const precioTicker = mercado.find((m) => m.ticker === ticker);
  const costoEstimado = precioTicker ? Number(precioTicker.precio) * Number(cantidad) : null;
  const holdingSeleccionado = estado?.holdings.find((h) => h.ticker === ticker);

  async function operar(tipo: "comprar" | "vender") {
    if (!ticker) return;
    setError(null);
    setMensaje(null);
    setOperando(true);
    try {
      const body: Record<string, string> = { ticker, cantidad };
      if (tipo === "comprar") body.apalancamiento = String(apalancamiento);
      await api.post(`/retos/${retoId}/${tipo}`, body);
      const msg = tipo === "comprar" ? t("challenge.buyDone") : t("challenge.sellDone");
      setMensaje(msg);
      toast(`${msg}: ${cantidad} ${limpiar(ticker)}`, "success");
      await cargarEstado();
      cargarRanking();
      cargarOrdenes();
      cargarMercado();
    } catch (err) {
      const m = err instanceof ApiError ? err.message : t("challenge.errorOrder");
      setError(m);
      toast(m, "error");
    } finally {
      setOperando(false);
    }
  }

  async function liquidar(tk?: string) {
    const mensajeConfirm = tk ? t("challenge.closeConfirm") : t("challenge.liquidateConfirm");
    if (!window.confirm(mensajeConfirm)) return;
    setError(null);
    setMensaje(null);
    setOperando(true);
    try {
      const url = tk ? `/retos/${retoId}/liquidar?ticker=${encodeURIComponent(tk)}` : `/retos/${retoId}/liquidar`;
      await api.post(url, {});
      const msg = tk ? t("challenge.closeDone") : t("challenge.liquidateDone");
      setMensaje(msg);
      toast(tk ? `${msg}: ${limpiar(tk)}` : msg, "success");
      await cargarEstado();
      cargarRanking();
      cargarOrdenes();
      cargarMercado();
    } catch (err) {
      const m = err instanceof ApiError ? err.message : t("challenge.errorOrder");
      setError(m);
      toast(m, "error");
    } finally {
      setOperando(false);
    }
  }

  if (!estado) {
    return (
      <main className="min-h-screen bg-canvas">
        <Navbar />
        <p className="p-6 text-fg/40">{t("challenge.loading")}</p>
      </main>
    );
  }

  const esCrisis = !!estado.reto.escenario_id;
  // La caída promedio que el escenario TENDRÁ al terminar — visible desde el inicio.
  const caídaTotalPromedio =
    mercado.length > 0 ? mercado.reduce((acc, m) => acc + m.cambio_total, 0) / mercado.length : 0;
  const cambioActualPromedio =
    mercado.length > 0 ? mercado.reduce((acc, m) => acc + m.cambio_porcentaje, 0) / mercado.length : 0;
  // En un reto de crisis activamos la atmósfera desde el principio.
  const enCrisis = esCrisis && caídaTotalPromedio < -1;

  const terminado = estado.progreso_porcentaje >= 100;
  const fin = new Date(estado.reto.fecha_fin).getTime();
  const restanteMs = fin - Date.now();
  const horas = Math.max(0, Math.floor(restanteMs / 3_600_000));
  const dias = Math.floor(horas / 24);
  const restante =
    dias >= 1
      ? `${dias}d ${horas % 24}h`
      : `${horas}h ${Math.max(0, Math.floor((restanteMs % 3_600_000) / 60000))}m`;

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />

      <div className="mx-auto max-w-6xl p-4 md:p-6">
        {/* Encabezado del reto */}
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <span
            className={`animate-pulse font-mono text-[11px] uppercase tracking-widest ${
              enCrisis ? "text-perdida" : "text-accent"
            }`}
          >
            ● {enCrisis ? "CRISIS EN VIVO" : t("retoMode.live")}
          </span>
          <h1 className="text-2xl font-bold text-fg">{estado.reto.nombre}</h1>
          <Badge tone={terminado ? "perdida" : enCrisis ? "perdida" : "ganancia"}>
            {terminado ? t("challenge.finished") : `${t("retoMode.ends")} ${restante}`}
          </Badge>
        </div>

        <p className="mb-4 text-sm text-fg/50">
          {activosReto.length > 0
            ? `${t("challenges.assets")}: ${activosReto.map(limpiar).join(", ")}`
            : escenario
            ? `${escenario.nombre} — ${escenario.descripcion}`
            : ""}
        </p>

        {/* Resumen final del reto */}
        {terminado && (() => {
          const sesionId = obtenerSesion()?.userId ?? null;
          const miPos = ranking.findIndex((r) => r.alumno_id === sesionId);
          const ganador = ranking[0];
          const soyGanador = miPos === 0;
          const rend = Number(estado.rendimiento_porcentaje);
          const mensaje = soyGanador
            ? "¡Ganaste el reto! Leíste la crisis mejor que nadie."
            : rend > 0
            ? "Saliste con ganancias a pesar de la crisis. ¡Bien hecho!"
            : "La crisis te alcanzó. Revisa tu historial y vuelve más fuerte.";
          return (
            <Card className="mb-6 border-2 border-accent p-5">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-accent">
                {t("challenge.finished")} · Resumen
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="font-mono text-[10px] uppercase text-fg/40">Tu lugar</p>
                  <p className="text-2xl font-black text-fg">
                    {miPos >= 0 ? `#${miPos + 1}` : "—"}
                    <span className="ml-1 text-sm font-normal text-fg/40">/ {ranking.length}</span>
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase text-fg/40">Tu rendimiento</p>
                  <p className={`text-2xl font-black ${rend >= 0 ? "text-ganancia" : "text-perdida"}`}>
                    {formatoPorcentaje(estado.rendimiento_porcentaje)}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase text-fg/40">Valor final</p>
                  <p className="text-2xl font-black text-fg">{formatoMoneda(estado.valor_total)}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase text-fg/40">Ganador</p>
                  <p className="truncate text-lg font-bold text-fg">{ganador?.nombre ?? "—"}</p>
                  {ganador && (
                    <p className="font-mono text-[11px] text-ganancia">
                      {formatoPorcentaje(ganador.rendimiento_porcentaje)}
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-4 text-sm text-fg/60">{mensaje}</p>
            </Card>
          );
        })()}

        {/* Banner inmersivo de crisis: muestra el crash proyectado */}
        {enCrisis && mercado.length > 0 && (
          <div className="mb-4 border border-perdida/30 bg-perdida/10 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-perdida">
                ⚠ Simulación de crash activa
              </span>
            </div>
            <div className="flex flex-wrap gap-4">
              {mercado.map((m) => (
                <div key={m.ticker} className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-fg/80">{limpiar(m.ticker)}</span>
                  <span className="font-mono text-xs text-fg/60">${Number(m.precio).toFixed(2)}</span>
                  {/* Caída acumulada en el reto */}
                  <span className={`font-mono text-xs font-bold ${m.cambio_porcentaje < 0 ? "text-perdida" : "text-ganancia"}`}>
                    {m.cambio_porcentaje >= 0 ? "+" : ""}{m.cambio_porcentaje.toFixed(1)}%
                  </span>
                  {/* Caída máxima proyectada (el fondo del escenario) */}
                  <span className="font-mono text-[10px] text-fg/30">
                    (fondo: {m.cambio_total >= 0 ? "+" : ""}{m.cambio_total.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 font-mono text-[10px] text-perdida/70">
              Fondo proyectado del mercado: {caídaTotalPromedio.toFixed(0)}% · Caída actual: {cambioActualPromedio.toFixed(1)}% · El mercado se recupera en la 2ª mitad
            </p>

            {/* Sentímetro del mercado */}
            {(() => {
              const s = sentimiento(cambioActualPromedio);
              return (
                <div className="mt-3 border-t border-perdida/20 pt-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fg/40">
                      Sentimiento del mercado
                    </span>
                    <span className="font-mono text-[11px] font-bold" style={{ color: s.color }}>
                      {s.label}
                    </span>
                  </div>
                  <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-[#dc2626] via-[#ca8a04] to-[#15803d]">
                    <div
                      className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas bg-fg shadow"
                      style={{ left: `${s.pos}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between font-mono text-[8px] uppercase tracking-wider text-fg/30">
                    <span>Pánico</span>
                    <span>Neutral</span>
                    <span>Euforia</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Barra de progreso */}
        <div className="mb-6 h-1.5 w-full bg-fg/10">
          <div
            className={`h-full transition-all ${enCrisis ? "bg-perdida" : "bg-accent"}`}
            style={{ width: `${estado.progreso_porcentaje}%` }}
          />
        </div>

        {/* KPIs */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label={t("challenge.availableCapital")} value={formatoMoneda(estado.capital_disponible)} />
          <StatTile label={t("challenge.totalValue")} value={formatoMoneda(estado.valor_total)} />
          <StatTile
            label={t("challenge.return")}
            value={formatoPorcentaje(estado.rendimiento_porcentaje)}
            tone={Number(estado.rendimiento_porcentaje) >= 0 ? "ganancia" : "perdida"}
          />
        </div>

        {/* Margin call alert */}
        {estado.prestamo_total && Number(estado.prestamo_total) > 0 &&
          Number(estado.valor_total) < Number(estado.prestamo_total) * 1.1 && (
          <div className="mb-4 bg-red-900/30 border border-red-700 text-red-300 px-4 py-3">
            <p className="font-mono text-[11px] uppercase tracking-wider font-bold">
              {t("reto.marginCallTitle")}
            </p>
            <p className="mt-1 font-mono text-[11px]">{t("reto.marginCallBody")}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {/* Periódico ficticio: narra el escenario conforme avanza */}
            {esCrisis && noticias && noticias.noticias.length > 0 && (
              <Card className="mb-4 border-2 border-fg/80 bg-[#f4f1e8] p-0">
                {/* Cabecera del periódico */}
                <div className="border-b-2 border-fg/80 px-4 py-3 text-center">
                  <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-fg/50">
                    Edición extraordinaria · Mercados
                  </p>
                  <h2 className="font-serif text-2xl font-black uppercase tracking-tight text-fg" style={{ fontFamily: "Georgia, serif" }}>
                    {noticias.periodico}
                  </h2>
                </div>
                {/* Titulares */}
                <div className="max-h-72 divide-y divide-fg/15 overflow-y-auto">
                  {noticias.noticias.map((n, i) => (
                    <article key={`${n.fecha}-${i}`} className={`px-4 py-3 ${i === 0 ? "bg-perdida/5" : ""}`}>
                      <div className="mb-1 flex items-baseline gap-2">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-fg/40">{n.fecha}</span>
                        {i === 0 && (
                          <span className="bg-perdida px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-white">
                            Última hora
                          </span>
                        )}
                      </div>
                      <h3
                        className={`font-bold leading-tight text-fg ${i === 0 ? "text-lg" : "text-sm"}`}
                        style={{ fontFamily: "Georgia, serif" }}
                      >
                        {n.titular}
                      </h3>
                      {i === 0 && <p className="mt-1 text-xs leading-relaxed text-fg/60">{n.cuerpo}</p>}
                    </article>
                  ))}
                </div>
              </Card>
            )}

            {/* Panel de trading mejorado */}
            {!terminado && tickersOperables.length > 0 && (
              <Card className="mb-4">
                <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">{t("challenge.trade")}</p>

                {/* Selector de ticker con precio en vivo */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {tickersOperables.map((tk) => {
                    const info = mercado.find((m) => m.ticker === tk);
                    const baja = info && info.cambio_porcentaje < 0;
                    const posicion = estado.holdings.find((h) => h.ticker === tk && Number(h.cantidad) !== 0);
                    return (
                      <button
                        key={tk}
                        onClick={() => setTicker(tk)}
                        className={`relative flex flex-col items-start rounded-none px-3 py-2 font-mono transition-colors ${
                          ticker === tk
                            ? enCrisis
                              ? "bg-perdida text-white"
                              : "bg-accent text-black"
                            : "bg-fg/5 text-fg/70 hover:bg-fg/10"
                        }`}
                      >
                        {posicion && (
                          <span
                            title={Number(posicion.cantidad) < 0 ? "Tienes un corto" : "Tienes una posición"}
                            className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${
                              Number(posicion.cantidad) < 0 ? "bg-perdida" : "bg-ganancia"
                            } ${ticker === tk ? "ring-1 ring-white" : ""}`}
                          />
                        )}
                        <span className="text-xs font-bold uppercase">{limpiar(tk)}</span>
                        {info && (
                          <>
                            <span className="text-[10px] tabular-nums opacity-80">
                              ${Number(info.precio).toFixed(2)}
                            </span>
                            <span
                              className={`text-[10px] font-bold ${
                                baja
                                  ? ticker === tk ? "text-white/80" : "text-perdida"
                                  : ticker === tk ? "text-white/80" : "text-ganancia"
                              }`}
                            >
                              {info.cambio_porcentaje >= 0 ? "▲ +" : "▼ "}
                              {info.cambio_porcentaje.toFixed(2)}%
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>

                {ticker && (
                  <>
                    {/* Resumen del activo seleccionado */}
                    {precioTicker && (
                      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="bg-fg/5 p-3">
                          <p className="mb-0.5 font-mono text-[10px] uppercase text-fg/40">Precio actual</p>
                          <p className="font-mono text-sm font-bold text-fg">
                            ${Number(precioTicker.precio).toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-fg/5 p-3">
                          <p className="mb-0.5 font-mono text-[10px] uppercase text-fg/40">Var. acumulada</p>
                          <p
                            className={`font-mono text-sm font-bold ${
                              precioTicker.cambio_porcentaje < 0 ? "text-perdida" : "text-ganancia"
                            }`}
                          >
                            {precioTicker.cambio_porcentaje >= 0 ? "+" : ""}
                            {precioTicker.cambio_porcentaje.toFixed(2)}%
                          </p>
                        </div>
                        <div className="bg-fg/5 p-3">
                          <p className="mb-0.5 font-mono text-[10px] uppercase text-fg/40">En mi portafolio</p>
                          <p className={`font-mono text-sm font-bold ${holdingSeleccionado && Number(holdingSeleccionado.cantidad) < 0 ? "text-perdida" : "text-fg"}`}>
                            {holdingSeleccionado ? Number(holdingSeleccionado.cantidad).toFixed(2) : "0"} acc.
                            {holdingSeleccionado && Number(holdingSeleccionado.cantidad) < 0 && " (corto)"}
                          </p>
                        </div>
                        <div className="bg-fg/5 p-3">
                          <p className="mb-0.5 font-mono text-[10px] uppercase text-fg/40">Costo estimado</p>
                          <p className="font-mono text-sm font-bold text-fg">
                            {costoEstimado !== null ? formatoMoneda(costoEstimado.toFixed(2)) : "—"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Gráfica del activo seleccionado */}
                    {esCrisis && (
                      <div className="mb-4">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-fg/40">
                            {limpiar(ticker)} · evolución en el reto
                          </p>
                          {serie.length >= 2 && (
                            <span
                              className={`font-mono text-[10px] font-bold ${
                                serie[serie.length - 1] < serie[0] ? "text-perdida" : "text-ganancia"
                              }`}
                            >
                              ${serie[serie.length - 1].toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="h-24 w-full border border-fg/10 bg-fg/[0.02] px-1">
                          <MiniGrafica serie={serie} baja={serie.length >= 2 && serie[serie.length - 1] < serie[0]} />
                        </div>
                      </div>
                    )}

                    {/* Atajos de cantidad según el capital disponible */}
                    {precioTicker && Number(precioTicker.precio) > 0 && (
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-fg/40">
                          Cantidad rápida:
                        </span>
                        {[0.25, 0.5, 1].map((frac) => {
                          const max = Number(estado.capital_disponible) / Number(precioTicker.precio);
                          const q = Math.floor(max * frac);
                          return (
                            <button
                              key={frac}
                              type="button"
                              disabled={q <= 0}
                              onClick={() => setCantidad(String(q))}
                              className="rounded-none border border-fg/20 px-2 py-1 font-mono text-[10px] font-bold uppercase text-fg/60 hover:border-accent hover:text-fg disabled:opacity-30"
                            >
                              {frac === 1 ? "Máx" : `${frac * 100}%`}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="mb-1 block text-sm font-medium text-fg/70">{t("challenge.quantity")}</label>
                      <input
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={cantidad}
                        onChange={(e) => setCantidad(e.target.value)}
                        className="w-28 rounded-none border border-fg/20 bg-canvas px-3 py-2 text-sm tabular-nums"
                      />
                    </div>

                    {/* Leverage selector */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-fg/40">
                        {t("terminal.leverage")}:
                      </span>
                      {[1, 2, 3, 5].map((lev) => (
                        <button
                          key={lev}
                          type="button"
                          onClick={() => setApalancamiento(lev)}
                          className={`rounded-none px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            apalancamiento === lev
                              ? "bg-accent text-black"
                              : "border border-fg/20 text-fg/50 hover:text-fg"
                          }`}
                        >
                          {lev}x
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => operar("comprar")}
                        disabled={operando}
                        className="rounded-none bg-ganancia px-5 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                      >
                        ▲ {t("challenge.buyCover")}
                      </button>
                      <button
                        onClick={() => operar("vender")}
                        disabled={operando}
                        className="rounded-none bg-perdida px-5 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                      >
                        ▼ {t("challenge.sellShort")}
                      </button>
                    </div>
                    {esCrisis && (
                      <p className="mt-3 font-mono text-[10px] leading-relaxed text-fg/40">
                        {t("challenge.shortHint")}
                      </p>
                    )}
                  </>
                )}
                {error && <p className="mt-3 text-sm text-perdida">{error}</p>}
                {mensaje && <p className="mt-3 text-sm text-ganancia">{mensaje}</p>}
              </Card>
            )}

            {/* Posiciones con P&L coloreado */}
            {estado.holdings.length > 0 && (
              <Card className="mb-4 overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-fg/5 px-4 py-2">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-fg/40">Mis posiciones</p>
                  {!terminado && (
                    <button
                      onClick={() => liquidar()}
                      disabled={operando}
                      className="rounded-none border border-perdida/40 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-perdida hover:bg-perdida hover:text-white disabled:opacity-50"
                    >
                      {t("challenge.liquidate")}
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-fg/5 text-left text-fg/60">
                    <tr>
                      <th className="px-3 py-3">{t("challenge.ticker")}</th>
                      <th className="px-3 py-3 text-right">{t("challenge.quantity")}</th>
                      <th className="px-3 py-3 text-right">{t("challenge.avgPrice")}</th>
                      <th className="px-3 py-3 text-right">{t("challenge.currentPrice")}</th>
                      <th className="px-3 py-3 text-right">P&L</th>
                      <th className="px-3 py-3 text-right">{t("challenge.marketValue")}</th>
                      {!terminado && <th className="px-3 py-3" />}
                    </tr>
                  </thead>
                  <tbody>
                    {estado.holdings.map((h) => {
                      const pl = (Number(h.precio_actual) - Number(h.precio_promedio)) * Number(h.cantidad);
                      const plPct =
                        Number(h.precio_promedio) > 0
                          ? ((Number(h.precio_actual) - Number(h.precio_promedio)) / Number(h.precio_promedio)) * 100
                          : 0;
                      return (
                        <tr key={h.ticker} className="border-t border-fg/5">
                          <td className="whitespace-nowrap px-3 py-3 font-mono font-bold text-fg">
                            {limpiar(h.ticker)}
                            {Number(h.cantidad) < 0 && (
                              <span className="ml-2 rounded-none bg-perdida/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-perdida">
                                {t("challenge.short")}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">{Number(h.cantidad).toFixed(2)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatoMoneda(h.precio_promedio)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatoMoneda(h.precio_actual)}</td>
                          <td className={`whitespace-nowrap px-3 py-3 text-right font-mono font-bold tabular-nums ${pl < 0 ? "text-perdida" : "text-ganancia"}`}>
                            {pl >= 0 ? "+" : ""}
                            {formatoMoneda(pl.toFixed(2))}
                            <span className="ml-1 text-[10px] opacity-70">
                              ({plPct >= 0 ? "+" : ""}{plPct.toFixed(1)}%)
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatoMoneda(h.valor_mercado)}</td>
                          {!terminado && (
                            <td className="px-3 py-3 text-right">
                              <button
                                onClick={() => liquidar(h.ticker)}
                                disabled={operando}
                                className="whitespace-nowrap rounded-none border border-fg/20 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-fg/60 hover:border-perdida hover:bg-perdida hover:text-white disabled:opacity-50"
                              >
                                {t("challenge.close")}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </Card>
            )}

            {/* Órdenes recientes */}
            {ordenes.length > 0 && (
              <Card className="overflow-hidden p-0">
                <p className="border-b border-fg/5 px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">
                  {t("history.title")}
                </p>
                <table className="w-full text-sm">
                  <tbody>
                    {ordenes.slice(0, 8).map((o) => (
                      <tr key={o.id} className="border-t border-fg/5">
                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded-none px-2 py-0.5 font-mono text-[11px] font-semibold uppercase ${
                              o.tipo === "compra" ? "bg-ganancia/10 text-ganancia" : "bg-perdida/10 text-perdida"
                            }`}
                          >
                            {o.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-fg">{limpiar(o.ticker)}</td>
                        <td className="px-4 py-2.5 font-mono tabular-nums text-fg/70">
                          {Number(o.cantidad).toFixed(4)}
                        </td>
                        <td className="px-4 py-2.5 font-mono tabular-nums">{formatoMoneda(o.precio_ejecucion)}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-fg/50">
                          {new Date(o.timestamp).toLocaleString("es-MX", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>

          {/* Ranking */}
          <div className="lg:col-span-4">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">
              {t("challenge.ranking")}
            </p>
            <Card className="overflow-hidden p-0">
              <ul className="divide-y divide-fg/5">
                {ranking.map((r, i) => {
                  const positivo = Number(r.rendimiento_porcentaje) >= 0;
                  return (
                    <li key={r.alumno_id} className="flex items-center gap-2 px-3 py-2.5">
                      <span className="w-5 shrink-0 text-center font-mono text-xs text-fg/40">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{r.nombre}</p>
                        <p className="font-mono text-[11px] tabular-nums text-fg/50">{formatoMoneda(r.valor_total)}</p>
                      </div>
                      <span
                        className={`shrink-0 font-mono text-xs font-bold tabular-nums ${
                          positivo ? "text-ganancia" : "text-perdida"
                        }`}
                      >
                        {positivo ? "+" : ""}
                        {Number(r.rendimiento_porcentaje).toFixed(1)}%
                      </span>
                    </li>
                  );
                })}
                {ranking.length === 0 && (
                  <li className="px-4 py-6 text-center font-mono text-sm text-fg/30">
                    {t("challenge.noParticipants")}
                  </li>
                )}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
