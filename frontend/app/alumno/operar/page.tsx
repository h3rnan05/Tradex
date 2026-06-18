"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProChart from "@/components/ProChart";
import BarraIndices from "@/components/BarraIndices";
import Tooltip from "@/components/Tooltip";
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
  nombre?: string;
  precio: string;
  cambio_porcentaje: number;
  sparkline?: number[];
}

const CATEGORIAS_EXPLORADOR: { key: string; label: string }[] = [
  { key: "acciones", label: "Acciones" },
  { key: "indices", label: "ETFs/Índices" },
  { key: "commodities", label: "Commodities" },
  { key: "crypto", label: "Cripto" },
  { key: "forex", label: "Divisas" },
];

const CAT_LABEL: Record<string, string> = {
  acciones: "Acción",
  indices: "ETF/Índice",
  commodities: "Commodity",
  crypto: "Cripto",
  forex: "Divisa",
};

// Sugerencias para el autocompletado del buscador (ticker + nombre + categoría)
const SUGERENCIAS: { ticker: string; nombre: string; cat: string }[] = [
  // Acciones
  { ticker: "AAPL", nombre: "Apple", cat: "acciones" },
  { ticker: "MSFT", nombre: "Microsoft", cat: "acciones" },
  { ticker: "GOOGL", nombre: "Alphabet (Google)", cat: "acciones" },
  { ticker: "AMZN", nombre: "Amazon", cat: "acciones" },
  { ticker: "NVDA", nombre: "NVIDIA", cat: "acciones" },
  { ticker: "TSLA", nombre: "Tesla", cat: "acciones" },
  { ticker: "META", nombre: "Meta (Facebook)", cat: "acciones" },
  { ticker: "NFLX", nombre: "Netflix", cat: "acciones" },
  { ticker: "JPM", nombre: "JPMorgan", cat: "acciones" },
  { ticker: "DIS", nombre: "Disney", cat: "acciones" },
  { ticker: "KO", nombre: "Coca-Cola", cat: "acciones" },
  { ticker: "NKE", nombre: "Nike", cat: "acciones" },
  { ticker: "AMD", nombre: "AMD", cat: "acciones" },
  { ticker: "INTC", nombre: "Intel", cat: "acciones" },
  { ticker: "BA", nombre: "Boeing", cat: "acciones" },
  { ticker: "PYPL", nombre: "PayPal", cat: "acciones" },
  // ETFs / Índices
  { ticker: "SPY", nombre: "S&P 500 ETF", cat: "indices" },
  { ticker: "QQQ", nombre: "Nasdaq 100 ETF", cat: "indices" },
  { ticker: "DIA", nombre: "Dow Jones ETF", cat: "indices" },
  { ticker: "IWM", nombre: "Russell 2000 ETF", cat: "indices" },
  { ticker: "VOO", nombre: "Vanguard S&P 500", cat: "indices" },
  { ticker: "VTI", nombre: "Vanguard Total Market", cat: "indices" },
  { ticker: "EFA", nombre: "Mercados Desarrollados", cat: "indices" },
  { ticker: "EEM", nombre: "Mercados Emergentes", cat: "indices" },
  // Commodities
  { ticker: "GLD", nombre: "Oro", cat: "commodities" },
  { ticker: "SLV", nombre: "Plata", cat: "commodities" },
  { ticker: "USO", nombre: "Petróleo", cat: "commodities" },
  { ticker: "UNG", nombre: "Gas Natural", cat: "commodities" },
  { ticker: "DBA", nombre: "Agricultura", cat: "commodities" },
  { ticker: "DBC", nombre: "Commodities Mix", cat: "commodities" },
  { ticker: "PPLT", nombre: "Platino", cat: "commodities" },
  { ticker: "PALL", nombre: "Paladio", cat: "commodities" },
  // Cripto
  { ticker: "BTC-USD", nombre: "Bitcoin", cat: "crypto" },
  { ticker: "ETH-USD", nombre: "Ethereum", cat: "crypto" },
  { ticker: "SOL-USD", nombre: "Solana", cat: "crypto" },
  { ticker: "XRP-USD", nombre: "XRP", cat: "crypto" },
  { ticker: "DOGE-USD", nombre: "Dogecoin", cat: "crypto" },
  { ticker: "ADA-USD", nombre: "Cardano", cat: "crypto" },
  { ticker: "AVAX-USD", nombre: "Avalanche", cat: "crypto" },
  { ticker: "LINK-USD", nombre: "Chainlink", cat: "crypto" },
  // Forex
  { ticker: "EURUSD=X", nombre: "Euro / Dólar", cat: "forex" },
  { ticker: "GBPUSD=X", nombre: "Libra / Dólar", cat: "forex" },
  { ticker: "USDJPY=X", nombre: "Dólar / Yen", cat: "forex" },
  { ticker: "USDMXN=X", nombre: "Dólar / Peso MX", cat: "forex" },
  { ticker: "USDCAD=X", nombre: "Dólar / Dólar CA", cat: "forex" },
  { ticker: "AUDUSD=X", nombre: "Dólar AU / Dólar", cat: "forex" },
  { ticker: "USDCHF=X", nombre: "Dólar / Franco CH", cat: "forex" },
  { ticker: "NZDUSD=X", nombre: "Dólar NZ / Dólar", cat: "forex" },
];

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

interface Holding {
  ticker: string;
  cantidad: string;
  precio_promedio: string;
  precio_actual: string;
  valor_mercado: string;
  pnl: string;
  pnl_porcentaje: string;
}

interface Portafolio {
  grupo_id: string;
  capital_disponible: string;
  holdings: Holding[];
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

interface Analistas {
  strong_buy: number;
  buy: number;
  hold: number;
  sell: number;
  strong_sell: number;
}

interface OrdenPendiente {
  id: string;
  ticker: string;
  tipo: "compra" | "venta";
  cantidad: string;
  precio_limite: string;
  estado: "pendiente" | "ejecutada" | "cancelada";
  creada_en: string | null;
  ejecutada_en: string | null;
}

interface Alerta {
  id: string;
  ticker: string;
  precio_objetivo: string;
  condicion: "gte" | "lte";
  disparada: boolean;
  disparada_en: string | null;
}

interface FichaEmpresa {
  pe_ratio: number | null;
  forward_pe: number | null;
  eps: number | null;
  market_cap: number | null;
  beta: number | null;
  max_52s: number | null;
  min_52s: number | null;
  precio_objetivo: number | null;
  recomendacion: string | null;
  analistas: Analistas;
}

function Sparkline({ data, subiendo }: { data: number[]; subiendo: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 72;
  const h = 32;
  const pad = 2;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - pad - ((v - min) / range) * (h - pad * 2)}`)
    .join(" ");
  const color = subiendo ? "#22c55e" : "#ef4444";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 opacity-85">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
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
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [ficha, setFicha] = useState<FichaEmpresa | null>(null);
  const [capitalDisponible, setCapitalDisponible] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState("1");
  const [tipoOrden, setTipoOrden] = useState<"mercado" | "limite">("mercado");
  const [precioLimite, setPrecioLimite] = useState("");
  const [precioAlerta, setPrecioAlerta] = useState("");
  const [condicionAlerta, setCondicionAlerta] = useState<"gte" | "lte">("lte");
  const [ordenesPendientes, setOrdenesPendientes] = useState<OrdenPendiente[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [operando, setOperando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [activosProximos, setActivosProximos] = useState<ActivoProximo[]>([]);
  const [activosDisponibles, setActivosDisponibles] = useState<string[]>([]);
  const [catActiva, setCatActiva] = useState<string>("");
  const [explorador, setExplorador] = useState<Record<string, Destacado[]>>({});
  const [cargandoCat, setCargandoCat] = useState(false);
  const [sugerenciasAbiertas, setSugerenciasAbiertas] = useState(false);

  useEffect(() => {
    api
      .get<Destacado[]>("/precios/destacados")
      .then(setDestacados)
      .catch(() => {});

    api
      .get<NoticiasGeneralesResponse>("/precios/noticias-generales")
      .then((r) => setNoticiasGenerales(r.noticias))
      .catch(() => {});

    api.get<OrdenPendiente[]>("/ordenes-limite").then(setOrdenesPendientes).catch(() => {});
    api.get<Alerta[]>("/ordenes-limite/alertas").then(setAlertas).catch(() => {});

    const sesion = obtenerSesion();
    if (sesion) {
      api
        .get<Portafolio>(`/alumnos/${sesion.userId}/portafolio`)
        .then((p) => {
          setActivosProximos(p.activos_proximos || []);
          setActivosDisponibles(p.activos_disponibles || []);
          setHoldings(p.holdings || []);
          setCapitalDisponible(p.capital_disponible);
        })
        .catch(() => {});
    }
  }, []);

  // Categorías que el alumno puede operar, en el orden del explorador
  const categoriasVisibles = CATEGORIAS_EXPLORADOR.filter((c) =>
    activosDisponibles.includes(c.key)
  );

  // Sugerencias del buscador: solo categorías permitidas, filtradas por lo escrito
  const q = ticker.trim().toLowerCase();
  const sugerenciasFiltradas = SUGERENCIAS.filter((s) => {
    if (activosDisponibles.length > 0 && !activosDisponibles.includes(s.cat)) return false;
    if (!q) return true;
    return (
      s.ticker.toLowerCase().includes(q) ||
      s.nombre.toLowerCase().includes(q)
    );
  }).slice(0, 8);

  async function cargarCategoria(cat: string) {
    if (explorador[cat]) return; // ya cargada
    setCargandoCat(true);
    try {
      const data = await api.get<Destacado[]>(`/precios/explorador/${cat}`);
      setExplorador((prev) => ({ ...prev, [cat]: data }));
    } catch {
      setExplorador((prev) => ({ ...prev, [cat]: [] }));
    } finally {
      setCargandoCat(false);
    }
  }

  // Al conocer las categorías permitidas, selecciona la primera y cárgala
  useEffect(() => {
    if (categoriasVisibles.length > 0 && !catActiva) {
      const primera = categoriasVisibles[0].key;
      setCatActiva(primera);
      cargarCategoria(primera);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activosDisponibles]);

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
      setFicha(null);
      if (historialData) setHistorial(historialData.historial);
      if (noticiasData) setNoticias(noticiasData.noticias);
      // Load company stats in background (non-blocking)
      api.get<FichaEmpresa>(`/precios/${tickerNormalizado}/ficha`).then(setFicha).catch(() => {});
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

  async function ejecutarOrdenLimite(tipo: "compra" | "venta") {
    setError(null);
    setMensaje(null);
    const sesion = obtenerSesion();
    if (!sesion) { setError("Tu sesión expiró"); return; }
    if (!Number(cantidad) || Number(cantidad) <= 0) { setError("Ingresa una cantidad válida"); return; }
    if (!Number(precioLimite) || Number(precioLimite) <= 0) { setError("Ingresa un precio límite válido"); return; }
    setOperando(true);
    try {
      const portafolio = await api.get<Portafolio>(`/alumnos/${sesion.userId}/portafolio`);
      await api.post("/ordenes-limite", {
        grupo_id: portafolio.grupo_id,
        ticker: ticker.trim().toUpperCase(),
        tipo,
        cantidad,
        precio_limite: precioLimite,
      });
      setMensaje(`Orden límite de ${tipo} creada: ${cantidad} ${ticker} @ $${Number(precioLimite).toFixed(2)}`);
      setPrecioLimite("");
      const updated = await api.get<OrdenPendiente[]>("/ordenes-limite").catch(() => []);
      setOrdenesPendientes(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la orden límite");
    } finally {
      setOperando(false);
    }
  }

  async function cancelarOrdenLimite(id: string) {
    try {
      await api.delete(`/ordenes-limite/${id}`);
      setOrdenesPendientes((prev) => prev.filter((o) => o.id !== id));
    } catch { /* silent */ }
  }

  async function crearAlerta() {
    setError(null);
    if (!Number(precioAlerta) || Number(precioAlerta) <= 0) { setError("Ingresa un precio de alerta válido"); return; }
    try {
      const nueva = await api.post<Alerta>("/ordenes-limite/alertas", {
        ticker: ticker.trim().toUpperCase(),
        precio_objetivo: precioAlerta,
        condicion: condicionAlerta,
      });
      setAlertas((prev) => [nueva, ...prev]);
      setPrecioAlerta("");
      setMensaje(`Alerta creada: ${ticker} ${condicionAlerta === "lte" ? "≤" : "≥"} $${Number(precioAlerta).toFixed(2)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la alerta");
    }
  }

  async function eliminarAlerta(id: string) {
    try {
      await api.delete(`/ordenes-limite/alertas/${id}`);
      setAlertas((prev) => prev.filter((a) => a.id !== id));
    } catch { /* silent */ }
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
      // Refresh holdings after order
      const p2 = await api.get<Portafolio>(`/alumnos/${sesion.userId}/portafolio`).catch(() => null);
      if (p2) {
        setHoldings(p2.holdings || []);
        setCapitalDisponible(p2.capital_disponible);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo ejecutar la orden");
    } finally {
      setOperando(false);
    }
  }

  async function ejecutarShort(endpoint: "short" | "cubrir") {
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
      const orden = await api.post<OrdenResponse>(`/ordenes/${endpoint}`, {
        grupo_id: portafolio.grupo_id,
        ticker: ticker.trim().toUpperCase(),
        cantidad,
      });
      setMensaje(
        `${endpoint === "short" ? "Posicion corta abierta" : "Corto cubierto"}: ${orden.cantidad} ${orden.ticker} a $${Number(
          orden.precio_ejecucion
        ).toFixed(2)}`
      );
      const p2 = await api.get<Portafolio>(`/alumnos/${sesion.userId}/portafolio`).catch(() => null);
      if (p2) {
        setHoldings(p2.holdings || []);
        setCapitalDisponible(p2.capital_disponible);
      }
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
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <h1 className="mb-4 text-2xl font-bold text-fg">Operar</h1>

        {activosProximos.length > 0 && (
          <Card className="mb-4 border-accent/30 bg-accent/5">
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
          className="mb-4 flex items-end gap-3 rounded-none border border-fg/10 bg-panel p-4 shadow-sm"
        >
          <div className="relative flex-1">
            <label className="mb-1 block text-sm font-medium text-fg/70">Ticker</label>
            <input
              required
              value={ticker}
              onChange={(e) => {
                setTicker(e.target.value);
                setSugerenciasAbiertas(true);
              }}
              onFocus={() => setSugerenciasAbiertas(true)}
              onBlur={() => setTimeout(() => setSugerenciasAbiertas(false), 150)}
              placeholder="Busca por símbolo o nombre (ej. AAPL, Bitcoin, Oro)"
              className="w-full rounded-none border border-fg/20 bg-canvas px-3 py-2 font-mono text-sm uppercase"
            />

            {sugerenciasAbiertas && sugerenciasFiltradas.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-none border border-fg/20 bg-panel shadow-lg">
                {sugerenciasFiltradas.map((s) => (
                  <li key={s.ticker}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSugerenciasAbiertas(false);
                        buscar(s.ticker);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-fg/5"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="font-mono text-sm font-bold text-fg">
                          {s.ticker.replace("-USD", "").replace("=X", "")}
                        </span>
                        <span className="truncate font-mono text-[11px] text-fg/50">{s.nombre}</span>
                      </span>
                      <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-fg/40">
                        {CAT_LABEL[s.cat]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="submit"
            disabled={buscando}
            className="rounded-none bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/80 disabled:opacity-50"
          >
            {buscando ? "Buscando..." : "Buscar"}
          </button>
        </form>

        <BarraIndices onSeleccionar={buscar} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">

          {/* ── Columna izquierda: Mi cartera ── */}
          <div className="lg:col-span-3">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">Mi cartera</p>

            {capitalDisponible !== null && (
              <div className="mb-2 rounded-none border border-fg/10 bg-panel px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-fg/40">Capital disponible</p>
                <p className="font-mono text-base font-bold tabular-nums text-fg">
                  ${Number(capitalDisponible).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}

            {holdings.length === 0 ? (
              <div className="rounded-none border border-fg/10 bg-panel p-4">
                <p className="text-sm text-fg/40">No tienes posiciones abiertas.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {holdings.map((h) => {
                  const pnlNum = Number(h.pnl);
                  const pnlPct = Number(h.pnl_porcentaje);
                  const gana = pnlNum >= 0;
                  return (
                    <button
                      key={h.ticker}
                      onClick={() => buscar(h.ticker)}
                      className={`w-full rounded-none border bg-panel px-3 py-3 text-left transition-colors hover:bg-fg/5 ${
                        ticker === h.ticker ? "border-accent/40 bg-accent/5" : "border-fg/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-fg">{h.ticker}</span>
                        <span className={`font-mono text-xs font-semibold ${gana ? "text-ganancia" : "text-perdida"}`}>
                          {gana ? "▲ +" : "▼ "}{pnlPct.toFixed(2)}%
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="font-mono text-xs tabular-nums text-fg/50">
                          {Number(h.cantidad).toFixed(4)} acc
                        </span>
                        <span className="font-mono text-xs tabular-nums text-fg/70">
                          ${Number(h.valor_mercado).toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-0.5">
                        <span className={`font-mono text-xs tabular-nums ${gana ? "text-ganancia" : "text-perdida"}`}>
                          {gana ? "+" : ""}${pnlNum.toFixed(2)} P&L
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Columna central: Noticias / Gráfica ── */}
          <div className="lg:col-span-6">
            {!precio ? (
              /* Landing: noticias generales */
              <div>
                <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">
                  Noticias · Mercados
                </p>
                {noticiasGenerales.length === 0 ? (
                  <Card><p className="text-sm text-fg/40">Cargando noticias...</p></Card>
                ) : (
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
                            className="h-44 w-full object-cover"
                          />
                        )}
                        <div className="p-4">
                          <p className="text-base font-semibold leading-snug text-fg group-hover:text-accent">
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
                              className="flex items-start gap-3 p-3 hover:bg-fg/5"
                            >
                              {n.imagen && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={n.imagen}
                                  alt=""
                                  className="mt-0.5 h-14 w-20 shrink-0 rounded-sm object-cover"
                                />
                              )}
                              <div>
                                <p className="text-sm font-medium leading-snug text-fg">{n.titulo}</p>
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
                )}
              </div>
            ) : (
              /* Ticker seleccionado: gráfica + orden */
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

                {/* Ficha de empresa */}
                {ficha && (() => {
                  const esIndice = ticker.startsWith("^") || ticker.endsWith("=F");
                  const fmt = (v: number | null, prefix = "") =>
                    v != null ? `${prefix}${v.toFixed(2)}` : null;
                  const fmtB = (v: number | null) =>
                    v != null ? `$${(v / 1e9).toFixed(1)}B` : null;

                  const statsAccion = [
                    { label: "P/E", value: fmt(ficha.pe_ratio), hint: "Precio/Ganancia: cuántas veces el precio de la acción supera sus ganancias anuales. Un P/E alto puede indicar que el mercado espera mucho crecimiento futuro." },
                    { label: "EPS", value: fmt(ficha.eps, "$"), hint: "Earnings Per Share (Ganancia por acción): cuánto dinero generó la empresa por cada acción emitida en el último año." },
                    { label: "Beta", value: fmt(ficha.beta), hint: "Mide la volatilidad de la acción vs el mercado. Beta > 1 = más volátil que el mercado; Beta < 1 = más estable." },
                    { label: "Cap. Mkt", value: fmtB(ficha.market_cap), hint: "Capitalización de mercado: valor total de la empresa según el precio actual de sus acciones (precio × acciones en circulación)." },
                    { label: "P/E Fwd", value: fmt(ficha.forward_pe), hint: "P/E Forward: igual que el P/E pero usando las ganancias proyectadas para los próximos 12 meses en vez de las pasadas." },
                    { label: "Objetivo", value: fmt(ficha.precio_objetivo, "$"), hint: "Precio objetivo promedio de los analistas de Wall Street para los próximos 12 meses." },
                  ];
                  const statsComun = [
                    { label: "Máx 52s", value: fmt(ficha.max_52s, "$"), hint: "Precio máximo al que cotizó la acción en los últimos 52 semanas (1 año)." },
                    { label: "Mín 52s", value: fmt(ficha.min_52s, "$"), hint: "Precio mínimo al que cotizó la acción en los últimos 52 semanas (1 año)." },
                  ];
                  const stats = esIndice
                    ? statsComun
                    : [...statsAccion, ...statsComun];

                  // Only render if at least one value is non-null
                  const hayDatos = stats.some((s) => s.value !== null);
                  if (!hayDatos) return null;

                  return (
                  <div className="mb-4">
                    <div className={`grid gap-2 ${esIndice ? "grid-cols-2" : "grid-cols-4"}`}>
                      {stats.map((s) => (
                        <div key={s.label} className="rounded-none border border-fg/10 bg-canvas px-2.5 py-2">
                          <p className="flex items-center font-mono text-[9px] uppercase tracking-widest text-fg/40">
                            {s.label}
                            {"hint" in s && s.hint && <Tooltip texto={s.hint} />}
                          </p>
                          <p className="font-mono text-sm font-semibold tabular-nums text-fg">{s.value ?? "—"}</p>
                        </div>
                      ))}
                    </div>

                    {/* Analyst rating bar */}
                    {ficha.analistas && (() => {
                      const a = ficha.analistas;
                      const total = a.strong_buy + a.buy + a.hold + a.sell + a.strong_sell;
                      if (total === 0) return null;
                      const pct = (n: number) => `${((n / total) * 100).toFixed(0)}%`;
                      const recMap: Record<string, string> = {
                        "strong_buy": "Compra fuerte", "buy": "Comprar",
                        "hold": "Mantener", "sell": "Vender", "strong_sell": "Venta fuerte",
                      };
                      const rec = ficha.recomendacion ? (recMap[ficha.recomendacion] ?? ficha.recomendacion) : null;
                      return (
                        <div className="mt-2 rounded-none border border-fg/10 bg-canvas px-3 py-2.5">
                          <div className="mb-1.5 flex items-center justify-between">
                            <p className="flex items-center font-mono text-[10px] uppercase tracking-widest text-fg/40">
                              Consenso analistas · {total} analistas
                              <Tooltip texto="Opinión de analistas profesionales de Wall Street sobre si conviene comprar, mantener o vender esta acción. No garantiza el desempeño futuro." />
                            </p>
                            {rec && (
                              <span className={`font-mono text-[11px] font-bold uppercase ${
                                ficha.recomendacion?.includes("buy") ? "text-ganancia" :
                                ficha.recomendacion?.includes("sell") ? "text-perdida" : "text-fg/60"
                              }`}>{rec}</span>
                            )}
                          </div>
                          <div className="flex h-2 w-full overflow-hidden rounded-full">
                            {a.strong_buy > 0 && <div style={{ width: pct(a.strong_buy) }} className="bg-ganancia" />}
                            {a.buy > 0 && <div style={{ width: pct(a.buy) }} className="bg-ganancia/60" />}
                            {a.hold > 0 && <div style={{ width: pct(a.hold) }} className="bg-fg/20" />}
                            {a.sell > 0 && <div style={{ width: pct(a.sell) }} className="bg-perdida/60" />}
                            {a.strong_sell > 0 && <div style={{ width: pct(a.strong_sell) }} className="bg-perdida" />}
                          </div>
                          <div className="mt-1.5 flex justify-between font-mono text-[10px] text-fg/50">
                            <span className="text-ganancia">▲ {a.strong_buy + a.buy} comprar</span>
                            <span>{a.hold} mantener</span>
                            <span className="text-perdida">▼ {a.sell + a.strong_sell} vender</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  );
                })()}

                <div className="mb-4 grid grid-cols-3 gap-3">
                  <div className="rounded-none border border-fg/10 bg-canvas px-3 py-2">
                    <p className="flex items-center font-mono text-[10px] uppercase tracking-widest text-fg/40">
                      Máx. 30d <Tooltip texto="Precio más alto registrado en los últimos 30 días." />
                    </p>
                    <p className="font-mono text-sm font-semibold tabular-nums text-fg">
                      {maximo !== null ? `$${maximo.toFixed(2)}` : "—"}
                    </p>
                  </div>
                  <div className="rounded-none border border-fg/10 bg-canvas px-3 py-2">
                    <p className="flex items-center font-mono text-[10px] uppercase tracking-widest text-fg/40">
                      Mín. 30d <Tooltip texto="Precio más bajo registrado en los últimos 30 días." />
                    </p>
                    <p className="font-mono text-sm font-semibold tabular-nums text-fg">
                      {minimo !== null ? `$${minimo.toFixed(2)}` : "—"}
                    </p>
                  </div>
                  <div className="rounded-none border border-fg/10 bg-canvas px-3 py-2">
                    <p className="flex items-center font-mono text-[10px] uppercase tracking-widest text-fg/40">
                      Apertura 30d <Tooltip texto="Precio al que cerró la acción hace 30 días, usado como referencia para calcular el cambio porcentual del período." />
                    </p>
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

                {/* Noticias del ticker debajo de la gráfica */}
                {noticias.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">
                      Noticias · {ticker}
                    </p>
                    <ul className="flex flex-col gap-3">
                      {noticias.map((n, i) => (
                        <li key={i} className="flex items-start gap-3 border-b border-fg/5 pb-3 last:border-0 last:pb-0">
                          {n.imagen && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={n.imagen} alt="" className="mt-0.5 h-12 w-16 shrink-0 rounded-sm object-cover" />
                          )}
                          <div>
                            <a
                              href={n.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-medium leading-snug text-fg hover:text-accent"
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
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-none border border-fg/10 bg-canvas p-4">
                  {/* Order type toggle */}
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-mono text-[11px] uppercase tracking-widest text-fg/40">
                      Enviar orden
                    </p>
                    <div className="flex overflow-hidden rounded-none border border-fg/20">
                      {(["mercado", "limite"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTipoOrden(t)}
                          className={`px-3 py-1 font-mono text-[11px] uppercase ${
                            tipoOrden === t ? "bg-ink text-white" : "text-fg/50 hover:bg-fg/5"
                          }`}
                        >
                          {t === "mercado" ? "Mercado" : "Límite"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {tipoOrden === "limite" && (
                    <div className="mb-3 rounded-none border border-accent/20 bg-accent/5 px-3 py-2">
                      <p className="font-mono text-[10px] text-fg/50">
                        <Tooltip texto="Una orden límite se ejecuta automáticamente cuando el precio alcanza el nivel que defines. Compra límite: se ejecuta si el precio baja a tu precio. Venta límite: se ejecuta si el precio sube a tu precio." />
                        {" "}Orden límite: se ejecuta cuando el precio toque tu nivel
                      </p>
                    </div>
                  )}

                  <label className="mb-1 block text-sm font-medium text-fg/70">Cantidad</label>
                  <input
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="mb-3 w-full rounded-none border border-fg/20 bg-panel px-3 py-2 font-mono text-sm"
                  />

                  {tipoOrden === "limite" && (
                    <>
                      <label className="mb-1 block text-sm font-medium text-fg/70">Precio límite</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={precioLimite}
                        onChange={(e) => setPrecioLimite(e.target.value)}
                        placeholder={precio ? `Actual: $${Number(precio).toFixed(2)}` : ""}
                        className="mb-3 w-full rounded-none border border-fg/20 bg-panel px-3 py-2 font-mono text-sm"
                      />
                    </>
                  )}

                  {tipoOrden === "mercado" && (
                    <p className="mb-3 text-sm text-fg/40">
                      Total estimado:{" "}
                      <span className="font-mono font-semibold text-fg">
                        ${(Number(precio) * Number(cantidad || 0)).toFixed(2)}
                      </span>
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => tipoOrden === "mercado" ? ejecutarOrden("compra") : ejecutarOrdenLimite("compra")}
                      disabled={operando}
                      className="flex-1 rounded-none bg-ganancia px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {tipoOrden === "limite" ? "Límite compra" : "Comprar"}
                    </button>
                    <button
                      onClick={() => tipoOrden === "mercado" ? ejecutarOrden("venta") : ejecutarOrdenLimite("venta")}
                      disabled={operando}
                      className="flex-1 rounded-none bg-perdida px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {tipoOrden === "limite" ? "Límite venta" : "Vender"}
                    </button>
                  </div>

                  {tipoOrden === "mercado" && (
                    <>
                      <div className="mt-3 border-t border-fg/10 pt-3">
                        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-fg/40">Ventas en corto</p>
                        <p className="mb-2 text-xs text-fg/50">
                          Vendes acciones prestadas esperando que el precio baje. Se bloquea el 100% como colateral.
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => ejecutarShort("short")}
                            disabled={operando}
                            className="flex-1 rounded-none border border-perdida bg-perdida/10 px-4 py-2 text-sm font-medium text-perdida hover:bg-perdida/20 disabled:opacity-50"
                          >
                            Corto (vender prestado)
                          </button>
                          <button
                            onClick={() => ejecutarShort("cubrir")}
                            disabled={operando}
                            className="flex-1 rounded-none border border-ganancia bg-ganancia/10 px-4 py-2 text-sm font-medium text-ganancia hover:bg-ganancia/20 disabled:opacity-50"
                          >
                            Cubrir corto
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  {error && <p className="mt-3 text-sm text-perdida">{error}</p>}
                  {mensaje && <p className="mt-3 text-sm text-ganancia">{mensaje}</p>}
                </div>

                {/* Price alert panel */}
                <div className="mt-3 rounded-none border border-fg/10 bg-canvas p-4">
                  <p className="mb-3 flex items-center font-mono text-[11px] uppercase tracking-widest text-fg/40">
                    Alerta de precio
                    <Tooltip texto="Te notifica (en esta página) cuando el precio de la acción suba o baje al nivel que defines. Útil para monitorear sin estar pendiente del precio todo el tiempo." />
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={condicionAlerta}
                      onChange={(e) => setCondicionAlerta(e.target.value as "gte" | "lte")}
                      className="rounded-none border border-fg/20 bg-panel px-2 py-2 font-mono text-xs text-fg"
                    >
                      <option value="lte">Baja a</option>
                      <option value="gte">Sube a</option>
                    </select>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={precioAlerta}
                      onChange={(e) => setPrecioAlerta(e.target.value)}
                      placeholder="Precio"
                      className="flex-1 rounded-none border border-fg/20 bg-panel px-3 py-2 font-mono text-sm"
                    />
                    <button
                      onClick={crearAlerta}
                      className="rounded-none border border-fg/20 px-3 py-2 font-mono text-xs hover:bg-fg/5"
                    >
                      + Alertar
                    </button>
                  </div>

                  {alertas.filter((a) => a.ticker === ticker).length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1">
                      {alertas.filter((a) => a.ticker === ticker).map((a) => (
                        <li key={a.id} className={`flex items-center justify-between rounded-none border px-2 py-1 text-xs ${a.disparada ? "border-ganancia/30 bg-ganancia/5" : "border-fg/10"}`}>
                          <span className="font-mono text-fg/70">
                            {a.condicion === "lte" ? "≤" : "≥"} ${Number(a.precio_objetivo).toFixed(2)}
                            {a.disparada && <span className="ml-2 text-ganancia">✓ Activada</span>}
                          </span>
                          <button onClick={() => eliminarAlerta(a.id)} className="text-fg/30 hover:text-perdida">✕</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Pending limit orders */}
                {ordenesPendientes.filter((o) => o.estado === "pendiente").length > 0 && (
                  <div className="mt-3 rounded-none border border-fg/10 bg-canvas p-4">
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">Órdenes límite pendientes</p>
                    <ul className="flex flex-col gap-1">
                      {ordenesPendientes.filter((o) => o.estado === "pendiente").map((o) => (
                        <li key={o.id} className="flex items-center justify-between rounded-none border border-fg/10 px-2 py-1.5 text-xs">
                          <span className={`font-mono font-semibold ${o.tipo === "compra" ? "text-ganancia" : "text-perdida"}`}>
                            {o.tipo.toUpperCase()}
                          </span>
                          <span className="font-mono text-fg">{o.ticker} · {Number(o.cantidad).toFixed(4)} acc</span>
                          <span className="font-mono text-fg/60">@ ${Number(o.precio_limite).toFixed(2)}</span>
                          <button onClick={() => cancelarOrdenLimite(o.id)} className="text-fg/30 hover:text-perdida">✕</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* ── Columna derecha: Explorar mercados ── */}
          <div className="lg:col-span-3">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">Explorar mercados</p>

            {categoriasVisibles.length > 1 && (
              <div className="mb-3 flex flex-wrap gap-1">
                {categoriasVisibles.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => {
                      setCatActiva(c.key);
                      cargarCategoria(c.key);
                    }}
                    className={`border px-2 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                      catActiva === c.key
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-fg/15 bg-panel text-fg/50 hover:text-fg"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {(cargandoCat && !explorador[catActiva]) && (
                <p className="rounded-none border border-fg/10 bg-panel p-3 text-sm text-fg/40">Cargando...</p>
              )}
              {categoriasVisibles.length === 0 && (
                <p className="rounded-none border border-fg/10 bg-panel p-3 text-sm text-fg/40">
                  Tu grupo aún no tiene mercados habilitados.
                </p>
              )}
              {(explorador[catActiva] || []).map((d) => {
                const sube = d.cambio_porcentaje >= 0;
                const activo = ticker === d.ticker;
                const sparkData = (d.sparkline || []).map(Number);
                return (
                  <button
                    key={d.ticker}
                    onClick={() => buscar(d.ticker)}
                    className={`flex w-full items-center gap-2 rounded-none border px-3 py-3 text-left transition-colors ${
                      activo ? "border-accent/40 bg-accent/5" : "border-fg/10 bg-panel hover:bg-fg/5"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-mono text-sm font-bold text-fg">
                        {d.ticker.replace("-USD", "").replace("=X", "")}
                      </span>
                      {d.nombre && (
                        <span className="truncate font-mono text-[10px] text-fg/40">{d.nombre}</span>
                      )}
                      <span className="font-mono text-xs tabular-nums text-fg/60">
                        ${Number(d.precio).toFixed(2)}
                      </span>
                    </div>
                    {sparkData.length > 1 && <Sparkline data={sparkData} subiendo={sube} />}
                    <span
                      className={`shrink-0 font-mono text-xs font-semibold tabular-nums ${
                        sube ? "text-ganancia" : "text-perdida"
                      }`}
                    >
                      {sube ? "▲ +" : "▼ "}
                      {d.cambio_porcentaje.toFixed(2)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
