"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import ProChart from "@/components/ProChart";
import MercadosMundo from "@/components/MercadosMundo";
import TopMovers from "@/components/TopMovers";
import { Badge, Card } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";

interface PrecioResponse {
  ticker: string;
  precio: string;
}

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

interface Destacado {
  ticker: string;
  precio: string;
  cambio_porcentaje: number;
  sparkline?: number[];
}

interface Noticia {
  titulo: string;
  fuente: string;
  link: string;
  fecha: string | null;
  imagen?: string | null;
}

interface NoticiasResponse {
  ticker: string;
  noticias: Noticia[];
}

interface NoticiasGeneralesResponse {
  noticias: Noticia[];
}

interface ActivoProximo {
  tipo_activo: string;
  fecha_activacion: string;
}

interface Portafolio {
  grupo_id: string;
  capital_disponible: string;
  activos_disponibles: string[];
  activos_proximos: ActivoProximo[];
}

interface OrdenResponse {
  id: string;
  ticker: string;
  tipo: "compra" | "venta";
  cantidad: string;
  precio_ejecucion: string;
}

function WatchlistSparkline({ data, subiendo }: { data: number[]; subiendo: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 52;
  const h = 24;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline points={points} fill="none" stroke={subiendo ? "#16a34a" : "#dc2626"} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function OperarPage() {
  return (
    <Suspense fallback={null}>
      <OperarPageInterna />
    </Suspense>
  );
}

function OperarPageInterna() {
  const searchParams = useSearchParams();
  const [ticker, setTicker] = useState("");
  const [precio, setPrecio] = useState<string | null>(null);
  const [historial, setHistorial] = useState<PuntoHistorial[]>([]);
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [noticiasGenerales, setNoticiasGenerales] = useState<Noticia[]>([]);
  const [destacados, setDestacados] = useState<Destacado[]>([]);
  const [cantidad, setCantidad] = useState("1");
  const [buscando, setBuscando] = useState(false);
  const [operando, setOperando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [activosProximos, setActivosProximos] = useState<ActivoProximo[]>([]);

  useEffect(() => {
    api
      .get<Destacado[]>("/precios/destacados")
      .then(setDestacados)
      .catch(() => {});

    api
      .get<NoticiasGeneralesResponse>("/precios/noticias-generales")
      .then((r) => setNoticiasGenerales(r.noticias))
      .catch(() => {});

    const sesion = obtenerSesion();
    if (sesion) {
      api
        .get<Portafolio>(`/alumnos/${sesion.userId}/portafolio`)
        .then((p) => setActivosProximos(p.activos_proximos || []))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const tickerUrl = searchParams.get("t");
    if (tickerUrl) buscar(tickerUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function buscar(tickerBuscado: string) {
    setError(null);
    setMensaje(null);
    setPrecio(null);
    setHistorial([]);
    setNoticias([]);
    setBuscando(true);
    try {
      const tickerNormalizado = tickerBuscado.trim().toUpperCase();
      const [data, historialData, noticiasData] = await Promise.all([
        api.get<PrecioResponse>(`/precios/${tickerNormalizado}`),
        api.get<HistorialResponse>(`/precios/${tickerNormalizado}/historial?dias=30`).catch(() => null),
        api.get<NoticiasResponse>(`/precios/${tickerNormalizado}/noticias`).catch(() => null),
      ]);
      setTicker(tickerNormalizado);
      setPrecio(data.precio);
      if (historialData) setHistorial(historialData.historial);
      if (noticiasData) setNoticias(noticiasData.noticias);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo obtener el precio");
    } finally {
      setBuscando(false);
    }
  }

  async function buscarPrecio(e: React.FormEvent) {
    e.preventDefault();
    await buscar(ticker);
  }

  async function ejecutarOrden(tipo: "compra" | "venta") {
    setError(null);
    setMensaje(null);

    const sesion = obtenerSesion();
    if (!sesion) {
      setError("Tu sesión expiró, vuelve a iniciar sesión");
      return;
    }
    const cantidadNum = Number(cantidad);
    if (!cantidadNum || cantidadNum <= 0) {
      setError("Ingresa una cantidad válida");
      return;
    }

    setOperando(true);
    try {
      const portafolio = await api.get<Portafolio>(`/alumnos/${sesion.userId}/portafolio`);
      const orden = await api.post<OrdenResponse>(`/ordenes/${tipo}`, {
        grupo_id: portafolio.grupo_id,
        ticker: ticker.trim().toUpperCase(),
        cantidad,
      });
      setMensaje(
        `${tipo === "compra" ? "Compra" : "Venta"} ejecutada: ${orden.cantidad} ${orden.ticker} a $${Number(
          orden.precio_ejecucion
        ).toFixed(2)}`
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo ejecutar la orden");
    } finally {
      setOperando(false);
    }
  }

  const precioInicial = historial.length > 0 ? Number(historial[0].precio) : null;
  const precioNum = precio ? Number(precio) : null;
  const cambioPorcentaje =
    precioNum !== null && precioInicial ? ((precioNum - precioInicial) / precioInicial) * 100 : null;
  const maximo =
    historial.length > 0 ? Math.max(...historial.map((h) => Number(h.maximo ?? h.precio))) : null;
  const minimo =
    historial.length > 0 ? Math.min(...historial.map((h) => Number(h.minimo ?? h.precio))) : null;
  const subiendo = (cambioPorcentaje ?? 0) >= 0;

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-7xl p-6">
        <h1 className="mb-6 text-2xl font-bold text-fg">Operar</h1>

        {activosProximos.length > 0 && (
          <Card className="mb-6 border-accent/30 bg-accent/5">
            <p className="text-sm text-fg/70">
              Algunos tipos de activos de tu grupo aún no están disponibles:{" "}
              {activosProximos
                .map(
                  (a) =>
                    `${a.tipo_activo} (desde el ${new Date(a.fecha_activacion).toLocaleDateString("es-MX")})`
                )
                .join(" · ")}
            </p>
          </Card>
        )}

        <form
          onSubmit={buscarPrecio}
          className="mb-6 flex items-end gap-3 rounded-none border border-fg/10 bg-panel p-4 shadow-sm"
        >
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-fg/70">Ticker</label>
            <input
              required
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="AAPL"
              className="w-full rounded-none border border-fg/20 px-3 py-2 font-mono text-sm uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={buscando}
            className="rounded-none bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/80 disabled:opacity-50"
          >
            {buscando ? "Buscando..." : "Buscar"}
          </button>
        </form>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Columna izquierda: watchlist */}
          <div className="lg:col-span-3">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">Watchlist</p>
            <div className="flex flex-col gap-2">
              {destacados.length === 0 && (
                <p className="rounded-none border border-fg/10 bg-panel p-3 text-sm text-fg/40">Cargando watchlist...</p>
              )}
              {destacados.map((d) => {
                const sube = d.cambio_porcentaje >= 0;
                const activo = ticker === d.ticker;
                const sparkData = (d.sparkline || []).map(Number);
                return (
                  <button
                    key={d.ticker}
                    onClick={() => buscar(d.ticker)}
                    className={`flex w-full items-center justify-between rounded-none border border-fg/10 px-3 py-3 text-left transition-colors ${
                      activo ? "border-accent/40 bg-accent/10" : "bg-panel hover:bg-fg/5"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-mono text-sm font-bold text-fg">{d.ticker}</span>
                      <span
                        className={`font-mono text-[11px] font-semibold tabular-nums ${
                          sube ? "text-ganancia" : "text-perdida"
                        }`}
                      >
                        {sube ? "▲ +" : "▼ "}
                        {d.cambio_porcentaje.toFixed(2)}%
                      </span>
                    </div>
                    {sparkData.length > 1 && (
                      <WatchlistSparkline data={sparkData} subiendo={sube} />
                    )}
                    <span className="font-mono text-sm tabular-nums text-fg/80">
                      ${Number(d.precio).toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Columna central: precio, gráfico, orden */}
          <div className="lg:col-span-6">
            {!precio ? (
              <TopMovers destacados={destacados} onSeleccionar={buscar} />
            ) : (
              <Card>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-fg/40">
                      {ticker.toUpperCase()}
                    </p>
                    <div className="flex items-baseline gap-3">
                      <p className="font-mono text-4xl font-bold tabular-nums text-fg">
                        ${Number(precio).toFixed(2)}
                      </p>
                      {cambioPorcentaje !== null && (
                        <Badge tone={subiendo ? "ganancia" : "perdida"}>
                          {subiendo ? "▲" : "▼"} {subiendo ? "+" : ""}
                          {cambioPorcentaje.toFixed(2)}% (30d)
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-none border border-fg/10 bg-canvas px-3 py-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-fg/40">Máx. 30d</p>
                    <p className="font-mono text-sm font-semibold tabular-nums text-fg">
                      {maximo !== null ? `$${maximo.toFixed(2)}` : "—"}
                    </p>
                  </div>
                  <div className="rounded-none border border-fg/10 bg-canvas px-3 py-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-fg/40">Mín. 30d</p>
                    <p className="font-mono text-sm font-semibold tabular-nums text-fg">
                      {minimo !== null ? `$${minimo.toFixed(2)}` : "—"}
                    </p>
                  </div>
                  <div className="rounded-none border border-fg/10 bg-canvas px-3 py-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-fg/40">Apertura 30d</p>
                    <p className="font-mono text-sm font-semibold tabular-nums text-fg">
                      {precioInicial !== null ? `$${precioInicial.toFixed(2)}` : "—"}
                    </p>
                  </div>
                </div>

                {historial.length > 0 && (
                  <div className="mb-4">
                    <ProChart
                      ticker={ticker}
                      noticias={noticias}
                      precio={precio}
                      cambioPorcentaje={cambioPorcentaje}
                      destacados={destacados}
                      onSeleccionarTicker={buscar}
                    />
                  </div>
                )}


                <div className="rounded-none border border-fg/10 bg-canvas p-4">
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">
                    Enviar orden
                  </p>
                  <label className="mb-1 block text-sm font-medium text-fg/70">Cantidad</label>
                  <input
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="mb-3 w-full rounded-none border border-fg/20 bg-panel px-3 py-2 font-mono text-sm"
                  />

                  <p className="mb-3 text-sm text-fg/40">
                    Total estimado:{" "}
                    <span className="font-mono font-semibold text-fg">
                      ${(Number(precio) * Number(cantidad || 0)).toFixed(2)}
                    </span>
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => ejecutarOrden("compra")}
                      disabled={operando}
                      className="flex-1 rounded-none bg-ganancia px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      Comprar
                    </button>
                    <button
                      onClick={() => ejecutarOrden("venta")}
                      disabled={operando}
                      className="flex-1 rounded-none bg-perdida px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      Vender
                    </button>
                  </div>

                  {error && <p className="mt-3 text-sm text-perdida">{error}</p>}
                  {mensaje && <p className="mt-3 text-sm text-ganancia">{mensaje}</p>}
                </div>
              </Card>
            )}
          </div>

          {/* Columna derecha: noticias */}
          <div className="lg:col-span-3">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">
              Noticias {ticker ? `· ${ticker.toUpperCase()}` : "· Mercados"}
            </p>

            {!ticker && noticiasGenerales.length > 0 ? (
              <div className="flex flex-col gap-3">
                {/* Featured story */}
                {noticiasGenerales[0] && (
                  <a
                    href={noticiasGenerales[0].link}
                    target="_blank"
                    rel="noreferrer"
                    className="group block overflow-hidden rounded-none border border-fg/10 bg-panel"
                  >
                    {noticiasGenerales[0].imagen && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={noticiasGenerales[0].imagen}
                        alt=""
                        className="h-36 w-full object-cover"
                      />
                    )}
                    <div className="p-3">
                      <p className="text-sm font-semibold leading-snug text-fg group-hover:text-accent">
                        {noticiasGenerales[0].titulo}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        {noticiasGenerales[0].fuente && <Badge>{noticiasGenerales[0].fuente}</Badge>}
                        {noticiasGenerales[0].fecha && (
                          <span className="text-xs text-fg/40">
                            {new Date(noticiasGenerales[0].fecha).toLocaleDateString("es-MX")}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                )}
                {/* Secondary list */}
                <div className="overflow-hidden rounded-none border border-fg/10 bg-panel">
                  <ul className="flex flex-col">
                    {noticiasGenerales.slice(1).map((n, i) => (
                      <li key={i} className="border-b border-fg/5 last:border-0">
                        <a
                          href={n.link}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-start gap-2 p-3 hover:bg-fg/5"
                        >
                          {n.imagen && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={n.imagen} alt="" className="mt-0.5 h-12 w-16 shrink-0 rounded-sm object-cover" />
                          )}
                          <div>
                            <p className="text-xs font-medium leading-snug text-fg">{n.titulo}</p>
                            <div className="mt-1 flex items-center gap-2">
                              {n.fuente && <span className="text-[10px] text-fg/40">{n.fuente}</span>}
                              {n.fecha && (
                                <span className="text-[10px] text-fg/30">
                                  {new Date(n.fecha).toLocaleDateString("es-MX")}
                                </span>
                              )}
                            </div>
                          </div>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <Card className="max-h-[640px] overflow-y-auto">
                {noticias.length === 0 ? (
                  <p className="text-sm text-fg/40">
                    {ticker ? "No hay noticias recientes." : "Cargando noticias..."}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {noticias.map((n, i) => (
                      <li key={i} className="border-b border-fg/5 pb-3 last:border-0 last:pb-0">
                        {n.imagen && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={n.imagen} alt="" className="mb-2 h-28 w-full rounded-sm object-cover" />
                        )}
                        <a
                          href={n.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-fg hover:text-accent"
                        >
                          {n.titulo}
                        </a>
                        <div className="mt-1 flex items-center gap-2">
                          {n.fuente && <Badge>{n.fuente}</Badge>}
                          {n.fecha && (
                            <span className="text-xs text-fg/40">
                              {new Date(n.fecha).toLocaleDateString("es-MX")}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            <div className="mt-4">
              <MercadosMundo compacto />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
