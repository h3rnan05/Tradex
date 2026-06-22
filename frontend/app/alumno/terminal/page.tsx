"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import ProChart from "@/components/ProChart";
import { api, ApiError } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { conGrupo, getGrupoActivo, setGrupoActivo } from "@/lib/clase";
import { useLanguage } from "@/lib/i18n";

/**
 * Terminal de operación estilo Bloomberg: una pantalla densa, oscura y
 * monoespaciada, con watchlist, gráfica grande, ticket de orden con selector
 * de apalancamiento (1x–5x) y panel de posiciones. Opera sobre la cartera
 * normal del alumno (no el reto), reutilizando los endpoints /ordenes/*.
 */

interface Holding {
  ticker: string;
  cantidad: string;
  precio_promedio: string;
  precio_actual: string;
  valor_mercado: string;
  pnl: string;
  pnl_porcentaje: string;
  es_corto: boolean;
  prestamo: string;
  apalancamiento: string;
}

interface Portafolio {
  grupo_id: string;
  capital_disponible: string;
  capital_inicial: string;
  holdings: Holding[];
  valor_total: string;
  rendimiento: string;
  rendimiento_porcentaje: string;
  prestamo_total: string;
}

interface PrecioResponse {
  ticker: string;
  precio: string;
}

interface Destacado {
  ticker: string;
  nombre?: string;
  precio: string;
  cambio_porcentaje: number;
  sparkline?: number[];
}

interface OrdenResponse {
  id: string;
  ticker: string;
  tipo: "compra" | "venta";
  cantidad: string;
  precio_ejecucion: string;
}

const NIVELES_APALANCAMIENTO = [1, 2, 3, 5];

function limpiar(t: string) {
  return t.replace("-USD", "").replace("=X", "").replace(".MX", "");
}

function money(v: string | number | null | undefined, dec = 2) {
  const n = Number(v ?? 0);
  return n.toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export default function TerminalPage() {
  return (
    <Suspense fallback={null}>
      <TerminalInterna />
    </Suspense>
  );
}

function TerminalInterna() {
  const { t } = useLanguage();
  const params = useSearchParams();

  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [capitalDisponible, setCapitalDisponible] = useState<string>("0");
  const [valorTotal, setValorTotal] = useState<string>("0");
  const [prestamoTotal, setPrestamoTotal] = useState<string>("0");
  const [rendPct, setRendPct] = useState<string>("0");
  const [holdings, setHoldings] = useState<Holding[]>([]);

  const [ticker, setTicker] = useState<string>(params.get("t")?.toUpperCase() || "AAPL");
  const [busqueda, setBusqueda] = useState<string>("");
  const [precio, setPrecio] = useState<string | null>(null);
  const [destacados, setDestacados] = useState<Destacado[]>([]);

  const [cantidad, setCantidad] = useState<string>("");
  const [apalancamiento, setApalancamiento] = useState<number>(1);
  const [operando, setOperando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const refrescarTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const recargarPortafolio = useCallback(async (gid?: string | null) => {
    const sesion = obtenerSesion();
    if (!sesion) return;
    const p = await api
      .get<Portafolio>(conGrupo(`/alumnos/${sesion.userId}/portafolio`, gid ?? grupoId))
      .catch(() => null);
    if (p) {
      setGrupoId(p.grupo_id);
      if (p.grupo_id) setGrupoActivo(p.grupo_id);
      setCapitalDisponible(p.capital_disponible);
      setValorTotal(p.valor_total);
      setPrestamoTotal(p.prestamo_total);
      setRendPct(p.rendimiento_porcentaje);
      setHoldings(p.holdings || []);
    }
  }, [grupoId]);

  // Carga inicial: portafolio + watchlist.
  useEffect(() => {
    recargarPortafolio(getGrupoActivo());
    api.get<Destacado[]>("/precios/destacados").then(setDestacados).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Precio del ticker seleccionado, con refresco cada 15s.
  const cargarPrecio = useCallback(async (tk: string) => {
    try {
      const r = await api.get<PrecioResponse>(`/precios/${encodeURIComponent(tk)}`);
      setPrecio(r.precio);
    } catch {
      setPrecio(null);
    }
  }, []);

  useEffect(() => {
    if (!ticker) return;
    cargarPrecio(ticker);
    if (refrescarTimer.current) clearInterval(refrescarTimer.current);
    refrescarTimer.current = setInterval(() => cargarPrecio(ticker), 15000);
    return () => {
      if (refrescarTimer.current) clearInterval(refrescarTimer.current);
    };
  }, [ticker, cargarPrecio]);

  function seleccionar(tk: string) {
    setTicker(tk.toUpperCase());
    setError(null);
    setMensaje(null);
  }

  function buscarSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tk = busqueda.trim().toUpperCase();
    if (tk) {
      setTicker(tk);
      setBusqueda("");
    }
  }

  const poderCompra = Number(capitalDisponible || 0) * apalancamiento;
  const precioNum = precio ? Number(precio) : null;
  const maxAccionesMargen = precioNum ? Math.floor(poderCompra / precioNum) : 0;

  async function ejecutar(endpoint: "compra" | "venta" | "short" | "cubrir") {
    setError(null);
    setMensaje(null);
    const sesion = obtenerSesion();
    if (!sesion) { setError(t("trade.errorSessionExpired")); return; }
    if (!grupoId) { setError(t("trade.errorNoGroup")); return; }
    const cantidadNum = Number(cantidad);
    if (!cantidadNum || cantidadNum <= 0) { setError(t("trade.errorQuantity")); return; }

    setOperando(true);
    try {
      const usaLev = endpoint === "compra" || endpoint === "short";
      const orden = await api.post<OrdenResponse>(`/ordenes/${endpoint}`, {
        grupo_id: grupoId,
        ticker: ticker.trim().toUpperCase(),
        cantidad,
        ...(usaLev ? { apalancamiento: String(apalancamiento) } : {}),
      });
      const etiqueta =
        endpoint === "compra" ? t("terminal.exBuy")
        : endpoint === "venta" ? t("terminal.exSell")
        : endpoint === "short" ? t("terminal.exShort")
        : t("terminal.exCover");
      const lev = usaLev && apalancamiento > 1 ? ` · ${apalancamiento}x` : "";
      setMensaje(`${etiqueta}: ${orden.cantidad} ${limpiar(orden.ticker)} @ $${money(orden.precio_ejecucion)}${lev}`);
      setCantidad("");
      await recargarPortafolio();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("trade.errorExecuteOrder"));
    } finally {
      setOperando(false);
    }
  }

  async function cerrarPosicion(h: Holding) {
    setError(null);
    setMensaje(null);
    const sesion = obtenerSesion();
    if (!sesion || !grupoId) return;
    const esCorto = h.es_corto;
    const endpoint = esCorto ? "cubrir" : "venta";
    setOperando(true);
    try {
      await api.post<OrdenResponse>(`/ordenes/${endpoint}`, {
        grupo_id: grupoId,
        ticker: h.ticker,
        cantidad: h.cantidad,
      });
      setMensaje(`${t("terminal.closed")}: ${limpiar(h.ticker)}`);
      await recargarPortafolio();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("trade.errorExecuteOrder"));
    } finally {
      setOperando(false);
    }
  }

  const rendNum = Number(rendPct || 0);

  const watchlist = useMemo(() => destacados.slice(0, 14), [destacados]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8]">
      <Navbar />

      {/* Cinta de cotización superior */}
      <div className="overflow-hidden border-b border-[#1f1f1f] bg-black">
        <div className="flex animate-[scroll_40s_linear_infinite] whitespace-nowrap py-1.5">
          {[...watchlist, ...watchlist].map((d, i) => (
            <span key={`${d.ticker}-${i}`} className="mx-4 font-mono text-[11px]">
              <span className="text-[#ff9e1b] font-bold">{limpiar(d.ticker)}</span>{" "}
              <span className="text-[#cfcfcf]">{money(d.precio)}</span>{" "}
              <span className={d.cambio_porcentaje >= 0 ? "text-[#26d07c]" : "text-[#ff4d4d]"}>
                {d.cambio_porcentaje >= 0 ? "+" : ""}{d.cambio_porcentaje.toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] p-3">
        {/* Encabezado de cuenta */}
        <div className="mb-3 grid grid-cols-2 gap-px overflow-hidden border border-[#1f1f1f] bg-[#1f1f1f] sm:grid-cols-4">
          {[
            { l: t("terminal.equity"), v: `$${money(valorTotal)}`, c: "text-[#e8e8e8]" },
            { l: t("terminal.cash"), v: `$${money(capitalDisponible)}`, c: "text-[#e8e8e8]" },
            { l: t("terminal.marginUsed"), v: `$${money(prestamoTotal)}`, c: Number(prestamoTotal) > 0 ? "text-[#ff9e1b]" : "text-[#7a7a7a]" },
            { l: t("terminal.return"), v: `${rendNum >= 0 ? "+" : ""}${rendNum.toFixed(2)}%`, c: rendNum >= 0 ? "text-[#26d07c]" : "text-[#ff4d4d]" },
          ].map((s) => (
            <div key={s.l} className="bg-[#111] px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-widest text-[#6a6a6a]">{s.l}</p>
              <p className={`font-mono text-lg font-bold tabular-nums ${s.c}`}>{s.v}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[200px_1fr_280px]">
          {/* Watchlist */}
          <div className="border border-[#1f1f1f] bg-[#111]">
            <p className="border-b border-[#1f1f1f] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#ff9e1b]">
              {t("terminal.watchlist")}
            </p>
            <ul className="max-h-[520px] overflow-y-auto">
              {watchlist.map((d) => {
                const activo = d.ticker.toUpperCase() === ticker.toUpperCase();
                return (
                  <li key={d.ticker}>
                    <button
                      onClick={() => seleccionar(d.ticker)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left font-mono text-[11px] transition-colors ${
                        activo ? "bg-[#1c1c1c]" : "hover:bg-[#161616]"
                      }`}
                    >
                      <span className="font-bold text-[#dcdcdc]">{limpiar(d.ticker)}</span>
                      <span className="flex flex-col items-end">
                        <span className="tabular-nums text-[#bdbdbd]">{money(d.precio)}</span>
                        <span className={`tabular-nums ${d.cambio_porcentaje >= 0 ? "text-[#26d07c]" : "text-[#ff4d4d]"}`}>
                          {d.cambio_porcentaje >= 0 ? "+" : ""}{d.cambio_porcentaje.toFixed(2)}%
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {watchlist.length === 0 && (
                <li className="px-3 py-4 font-mono text-[10px] text-[#5a5a5a]">{t("terminal.loading")}</li>
              )}
            </ul>
          </div>

          {/* Centro: búsqueda + gráfica */}
          <div className="space-y-3">
            <form onSubmit={buscarSubmit} className="flex items-center border border-[#1f1f1f] bg-[#111]">
              <span className="px-3 font-mono text-sm font-bold text-[#ff9e1b]">{limpiar(ticker)}</span>
              <span className="ml-auto px-3 font-mono text-lg font-bold tabular-nums text-[#e8e8e8]">
                {precio ? `$${money(precio)}` : "—"}
              </span>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={t("terminal.symbol")}
                className="w-28 border-l border-[#1f1f1f] bg-transparent px-3 py-2 font-mono text-[12px] uppercase tracking-wide text-[#e8e8e8] outline-none placeholder:text-[#5a5a5a]"
              />
              <button type="submit" className="bg-[#ff9e1b] px-3 py-2 font-mono text-[10px] font-bold uppercase text-black">
                {t("nav.go")}
              </button>
            </form>

            <div className="border border-[#1f1f1f] bg-[#111] p-2">
              {/* ProChart se encarga de cargar el historial y dibujar la gráfica */}
              <ProChart
                ticker={ticker}
                precio={precio}
                destacados={destacados}
                onSeleccionarTicker={seleccionar}
              />
            </div>
          </div>

          {/* Ticket de orden */}
          <div className="space-y-3">
            <div className="border border-[#1f1f1f] bg-[#111]">
              <p className="border-b border-[#1f1f1f] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#ff9e1b]">
                {t("terminal.orderTicket")}
              </p>
              <div className="space-y-3 p-3">
                {/* Cantidad */}
                <div>
                  <label className="font-mono text-[9px] uppercase tracking-widest text-[#6a6a6a]">{t("terminal.quantity")}</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 font-mono text-sm tabular-nums text-[#e8e8e8] outline-none focus:border-[#ff9e1b]"
                  />
                  <div className="mt-1 flex gap-1">
                    {[0.25, 0.5, 1].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => maxAccionesMargen > 0 && setCantidad(String(Math.floor(maxAccionesMargen * f)))}
                        className="flex-1 border border-[#2a2a2a] py-1 font-mono text-[10px] text-[#9a9a9a] hover:border-[#ff9e1b] hover:text-[#ff9e1b]"
                      >
                        {f === 1 ? t("terminal.max") : `${f * 100}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Apalancamiento */}
                <div>
                  <label className="font-mono text-[9px] uppercase tracking-widest text-[#6a6a6a]">
                    {t("terminal.leverage")}
                  </label>
                  <div className="mt-1 flex gap-1">
                    {NIVELES_APALANCAMIENTO.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setApalancamiento(n)}
                        className={`flex-1 border py-2 font-mono text-[12px] font-bold transition-colors ${
                          apalancamiento === n
                            ? "border-[#ff9e1b] bg-[#ff9e1b] text-black"
                            : "border-[#2a2a2a] text-[#9a9a9a] hover:border-[#ff9e1b]"
                        }`}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 font-mono text-[9px] text-[#6a6a6a]">
                    {t("terminal.buyingPower")}: <span className="text-[#26d07c]">${money(poderCompra)}</span>
                    {precioNum ? ` · ${t("terminal.maxShares")} ${maxAccionesMargen}` : ""}
                  </p>
                  {apalancamiento > 1 && (
                    <p className="mt-1 font-mono text-[9px] text-[#ff9e1b]">{t("terminal.leverageWarn")}</p>
                  )}
                </div>

                {/* Botones de ejecución */}
                <div className="grid grid-cols-2 gap-1">
                  <button
                    disabled={operando}
                    onClick={() => ejecutar("compra")}
                    className="bg-[#1f7a4d] py-2.5 font-mono text-[11px] font-bold uppercase tracking-wide text-white hover:bg-[#26d07c] hover:text-black disabled:opacity-40"
                  >
                    {t("terminal.buy")}
                  </button>
                  <button
                    disabled={operando}
                    onClick={() => ejecutar("venta")}
                    className="bg-[#8a2a2a] py-2.5 font-mono text-[11px] font-bold uppercase tracking-wide text-white hover:bg-[#ff4d4d] hover:text-black disabled:opacity-40"
                  >
                    {t("terminal.sell")}
                  </button>
                  <button
                    disabled={operando}
                    onClick={() => ejecutar("short")}
                    className="border border-[#8a2a2a] py-2.5 font-mono text-[11px] font-bold uppercase tracking-wide text-[#ff7a7a] hover:bg-[#8a2a2a] hover:text-white disabled:opacity-40"
                  >
                    {t("terminal.short")}
                  </button>
                  <button
                    disabled={operando}
                    onClick={() => ejecutar("cubrir")}
                    className="border border-[#1f7a4d] py-2.5 font-mono text-[11px] font-bold uppercase tracking-wide text-[#7ee0ad] hover:bg-[#1f7a4d] hover:text-white disabled:opacity-40"
                  >
                    {t("terminal.cover")}
                  </button>
                </div>

                {error && <p className="font-mono text-[10px] text-[#ff4d4d]">{error}</p>}
                {mensaje && <p className="font-mono text-[10px] text-[#26d07c]">{mensaje}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Posiciones */}
        <div className="mt-3 border border-[#1f1f1f] bg-[#111]">
          <p className="border-b border-[#1f1f1f] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#ff9e1b]">
            {t("terminal.positions")}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] font-mono text-[11px]">
              <thead className="text-[#6a6a6a]">
                <tr className="border-b border-[#1f1f1f]">
                  <th className="px-3 py-2 text-left">{t("terminal.symbol")}</th>
                  <th className="px-3 py-2 text-right">{t("terminal.quantity")}</th>
                  <th className="px-3 py-2 text-right">{t("terminal.avg")}</th>
                  <th className="px-3 py-2 text-right">{t("terminal.last")}</th>
                  <th className="px-3 py-2 text-right">{t("terminal.lev")}</th>
                  <th className="px-3 py-2 text-right">{t("terminal.value")}</th>
                  <th className="px-3 py-2 text-right">P&amp;L</th>
                  <th className="px-3 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const pnl = Number(h.pnl);
                  const lev = Number(h.apalancamiento || 1);
                  return (
                    <tr key={`${h.ticker}-${h.es_corto}`} className="border-b border-[#161616] hover:bg-[#161616]">
                      <td className="whitespace-nowrap px-3 py-2 font-bold text-[#dcdcdc]">
                        {limpiar(h.ticker)}
                        {h.es_corto && <span className="ml-2 bg-[#8a2a2a] px-1 text-[9px] text-white">{t("terminal.short")}</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-[#bdbdbd]">{money(h.cantidad, 0)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-[#bdbdbd]">{money(h.precio_promedio)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-[#bdbdbd]">{money(h.precio_actual)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <span className={lev > 1 ? "text-[#ff9e1b]" : "text-[#5a5a5a]"}>{lev.toFixed(lev % 1 ? 1 : 0)}x</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-[#bdbdbd]">${money(h.valor_mercado)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${pnl >= 0 ? "text-[#26d07c]" : "text-[#ff4d4d]"}`}>
                        {pnl >= 0 ? "+" : ""}{money(h.pnl)} ({Number(h.pnl_porcentaje).toFixed(1)}%)
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          disabled={operando}
                          onClick={() => cerrarPosicion(h)}
                          className="whitespace-nowrap border border-[#2a2a2a] px-2 py-1 text-[10px] text-[#9a9a9a] hover:border-[#ff9e1b] hover:text-[#ff9e1b] disabled:opacity-40"
                        >
                          {t("terminal.close")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {holdings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-[10px] text-[#5a5a5a]">
                      {t("terminal.noPositions")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
