"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Badge, Card, StatTile, formatoMoneda, formatoPorcentaje } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

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

export default function RetoActivo({ retoId }: { retoId: string }) {
  const { t } = useLanguage();
  const [estado, setEstado] = useState<RetoEstado | null>(null);
  const [escenario, setEscenario] = useState<Escenario | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [ordenes, setOrdenes] = useState<RetoOrden[]>([]);
  const [mercado, setMercado] = useState<MercadoEntry[]>([]);
  const [noticias, setNoticias] = useState<NoticiasResp | null>(null);
  const [ticker, setTicker] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState("1");
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

  useEffect(() => {
    if (!estado?.reto.escenario_id) return;
    api
      .get<Escenario[]>("/precios/escenarios")
      .then((lista) => setEscenario(lista.find((e) => e.id === estado.reto.escenario_id) ?? null))
      .catch(() => {});
  }, [estado?.reto.escenario_id]);

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
      await api.post(`/retos/${retoId}/${tipo}`, { ticker, cantidad });
      setMensaje(tipo === "comprar" ? t("challenge.buyDone") : t("challenge.sellDone"));
      await cargarEstado();
      cargarRanking();
      cargarOrdenes();
      cargarMercado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("challenge.errorOrder"));
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
                <div className="divide-y divide-fg/15">
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
                    return (
                      <button
                        key={tk}
                        onClick={() => setTicker(tk)}
                        className={`flex flex-col items-start rounded-none px-3 py-2 font-mono transition-colors ${
                          ticker === tk
                            ? enCrisis
                              ? "bg-perdida text-white"
                              : "bg-accent text-black"
                            : "bg-fg/5 text-fg/70 hover:bg-fg/10"
                        }`}
                      >
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

                    <div className="flex items-end gap-3">
                      <div>
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
                <p className="border-b border-fg/5 px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">
                  Mis posiciones
                </p>
                <table className="w-full text-sm">
                  <thead className="bg-fg/5 text-left text-fg/60">
                    <tr>
                      <th className="px-4 py-3">{t("challenge.ticker")}</th>
                      <th className="px-4 py-3">{t("challenge.quantity")}</th>
                      <th className="px-4 py-3">{t("challenge.avgPrice")}</th>
                      <th className="px-4 py-3">{t("challenge.currentPrice")}</th>
                      <th className="px-4 py-3">P&L</th>
                      <th className="px-4 py-3">{t("challenge.marketValue")}</th>
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
                          <td className="px-4 py-3 font-mono font-bold text-fg">
                            {limpiar(h.ticker)}
                            {Number(h.cantidad) < 0 && (
                              <span className="ml-2 rounded-none bg-perdida/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-perdida">
                                {t("challenge.short")}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 tabular-nums">{Number(h.cantidad).toFixed(4)}</td>
                          <td className="px-4 py-3 tabular-nums">{formatoMoneda(h.precio_promedio)}</td>
                          <td className="px-4 py-3 tabular-nums">{formatoMoneda(h.precio_actual)}</td>
                          <td className={`px-4 py-3 font-mono font-bold tabular-nums ${pl < 0 ? "text-perdida" : "text-ganancia"}`}>
                            {pl >= 0 ? "+" : ""}
                            {formatoMoneda(pl.toFixed(2))}
                            <span className="ml-1 text-[10px] opacity-70">
                              ({plPct >= 0 ? "+" : ""}{plPct.toFixed(1)}%)
                            </span>
                          </td>
                          <td className="px-4 py-3 tabular-nums">{formatoMoneda(h.valor_mercado)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
              <table className="w-full text-sm">
                <tbody>
                  {ranking.map((r, i) => (
                    <tr key={r.alumno_id} className="border-t border-fg/5 first:border-t-0">
                      <td className="px-3 py-2.5 text-fg/40">{terminado && i === 0 ? "🏅" : i + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-fg">{r.nombre}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                        {formatoMoneda(r.valor_total)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Badge tone={Number(r.rendimiento_porcentaje) >= 0 ? "ganancia" : "perdida"}>
                          {formatoPorcentaje(r.rendimiento_porcentaje)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {ranking.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center font-mono text-sm text-fg/30">
                        {t("challenge.noParticipants")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
