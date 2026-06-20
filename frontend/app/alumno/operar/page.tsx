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
import { useLanguage } from "@/lib/i18n";

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
  { key: "bolsa_mx", label: "Bolsa MX" },
];

const CAT_LABEL: Record<string, string> = {
  acciones: "Acción",
  indices: "ETF/Índice",
  commodities: "Commodity",
  crypto: "Cripto",
  forex: "Divisa",
  bolsa_mx: "Bolsa MX",
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
  // Bolsa Mexicana de Valores
  { ticker: "AMXL.MX", nombre: "América Móvil", cat: "bolsa_mx" },
  { ticker: "FEMSAUBD.MX", nombre: "FEMSA", cat: "bolsa_mx" },
  { ticker: "WALMEX.MX", nombre: "Walmart México", cat: "bolsa_mx" },
  { ticker: "GMEXICOB.MX", nombre: "Grupo México", cat: "bolsa_mx" },
  { ticker: "GFNORTEO.MX", nombre: "Banorte", cat: "bolsa_mx" },
  { ticker: "BIMBOA.MX", nombre: "Bimbo", cat: "bolsa_mx" },
  { ticker: "CEMEXCPO.MX", nombre: "CEMEX", cat: "bolsa_mx" },
  { ticker: "ALSEA.MX", nombre: "Alsea", cat: "bolsa_mx" },
  { ticker: "GRUMAB.MX", nombre: "Gruma", cat: "bolsa_mx" },
  { ticker: "LABB.MX", nombre: "Genomma Lab", cat: "bolsa_mx" },
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

interface NoticiasTicker {
  ticker: string;
  noticias: Noticia[];
}

const MAX_TICKERS_DIARIO = 5;

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
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const [ticker, setTicker] = useState("");
  const [precio, setPrecio] = useState<string | null>(null);
  const [historial, setHistorial] = useState<PuntoHistorial[]>([]);
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [noticiasGenerales, setNoticiasGenerales] = useState<Noticia[]>([]);
  const [noticiasPorTicker, setNoticiasPorTicker] = useState<NoticiasTicker[]>([]);
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
  const [grupoId, setGrupoId] = useState<string | null>(null);

  useEffect(() => {
    const sesion = obtenerSesion();

    // Lanzar todas las cargas iniciales en paralelo
    Promise.all([
      api.get<Destacado[]>("/precios/destacados").catch(() => [] as Destacado[]),
      api.get<NoticiasGeneralesResponse>("/precios/noticias-generales").catch(() => ({ noticias: [] })),
      api.get<OrdenPendiente[]>("/ordenes-limite").catch(() => [] as OrdenPendiente[]),
      api.get<Alerta[]>("/ordenes-limite/alertas").catch(() => [] as Alerta[]),
      sesion
        ? api.get<Portafolio>(`/alumnos/${sesion.userId}/portafolio`).catch(() => null)
        : Promise.resolve(null),
    ]).then(([dest, notiGen, ordenes, alertasData, portafolio]) => {
      setDestacados(dest);
      setNoticiasGenerales(notiGen.noticias);
      setOrdenesPendientes(ordenes);
      setAlertas(alertasData);
      if (portafolio) {
        setActivosProximos(portafolio.activos_proximos || []);
        setActivosDisponibles(portafolio.activos_disponibles || []);
        setHoldings(portafolio.holdings || []);
        setCapitalDisponible(portafolio.capital_disponible);
        setGrupoId(portafolio.grupo_id);

        // Noticias de las posiciones del alumno (para el Tradex Times)
        const tickersCartera = Array.from(
          new Set((portafolio.holdings || []).map((h) => h.ticker))
        ).slice(0, MAX_TICKERS_DIARIO);
        if (tickersCartera.length > 0) {
          Promise.all(
            tickersCartera.map((tk) =>
              api
                .get<NoticiasResponse>(`/precios/${tk}/noticias`)
                .catch(() => ({ ticker: tk, noticias: [] as Noticia[] }))
            )
          ).then((res) =>
            setNoticiasPorTicker(res.filter((n) => n.noticias.length > 0))
          );
        }
      }
    });
  }, []);

  // Categorías que el alumno puede operar, en el orden del explorador
  const CAT_LABELS_I18N: Record<string, string> = {
    acciones: t("trade.catAcciones"),
    indices: t("trade.catIndices"),
    commodities: t("trade.catCommodities"),
    crypto: t("trade.catCrypto"),
    forex: t("trade.catForex"),
    bolsa_mx: t("trade.catBolsaMx"),
  };
  const CAT_TAG_I18N: Record<string, string> = {
    acciones: t("trade.tagAcciones"),
    indices: t("trade.tagIndices"),
    commodities: t("trade.tagCommodities"),
    crypto: t("trade.tagCrypto"),
    forex: t("trade.tagForex"),
    bolsa_mx: t("trade.tagBolsaMx"),
  };

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
      setError(err instanceof ApiError ? err.message : t("trade.errorPrice"));
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
    if (!sesion) { setError(t("trade.errorSession")); return; }
    if (!grupoId) { setError(t("trade.errorNoGroup")); return; }
    if (!Number(cantidad) || Number(cantidad) <= 0) { setError(t("trade.errorQuantity")); return; }
    if (!Number(precioLimite) || Number(precioLimite) <= 0) { setError(t("trade.errorLimitPrice")); return; }
    setOperando(true);
    try {
      await api.post("/ordenes-limite", {
        grupo_id: grupoId,
        ticker: ticker.trim().toUpperCase(),
        tipo,
        cantidad,
        precio_limite: precioLimite,
      });
      setMensaje(`${t(tipo === "compra" ? "trade.limitBuyCreated" : "trade.limitSellCreated")}: ${cantidad} ${ticker} @ $${Number(precioLimite).toFixed(2)}`);
      setPrecioLimite("");
      const updated = await api.get<OrdenPendiente[]>("/ordenes-limite").catch(() => []);
      setOrdenesPendientes(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("trade.errorCreateLimit"));
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
    if (!Number(precioAlerta) || Number(precioAlerta) <= 0) { setError(t("trade.errorAlertPrice")); return; }
    try {
      const nueva = await api.post<Alerta>("/ordenes-limite/alertas", {
        ticker: ticker.trim().toUpperCase(),
        precio_objetivo: precioAlerta,
        condicion: condicionAlerta,
      });
      setAlertas((prev) => [nueva, ...prev]);
      setPrecioAlerta("");
      setMensaje(`${t("trade.alertCreated")}: ${ticker} ${condicionAlerta === "lte" ? "≤" : "≥"} $${Number(precioAlerta).toFixed(2)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("trade.errorCreateAlert"));
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
    if (!sesion) { setError(t("trade.errorSessionExpired")); return; }
    if (!grupoId) { setError(t("trade.errorNoGroup")); return; }
    const cantidadNum = Number(cantidad);
    if (!cantidadNum || cantidadNum <= 0) { setError(t("trade.errorQuantity")); return; }

    setOperando(true);
    try {
      const orden = await api.post<OrdenResponse>(`/ordenes/${tipo}`, {
        grupo_id: grupoId,
        ticker: ticker.trim().toUpperCase(),
        cantidad,
      });
      setMensaje(
        `${t(tipo === "compra" ? "trade.buyDone" : "trade.sellDone")}: ${orden.cantidad} ${orden.ticker} ${t("templates.at")} $${Number(orden.precio_ejecucion).toFixed(2)}`
      );
      const p2 = await api.get<Portafolio>(`/alumnos/${sesion.userId}/portafolio`).catch(() => null);
      if (p2) {
        setHoldings(p2.holdings || []);
        setCapitalDisponible(p2.capital_disponible);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("trade.errorExecuteOrder"));
    } finally {
      setOperando(false);
    }
  }

  async function ejecutarShort(endpoint: "short" | "cubrir") {
    setError(null);
    setMensaje(null);

    const sesion = obtenerSesion();
    if (!sesion) { setError(t("trade.errorSessionExpired")); return; }
    if (!grupoId) { setError(t("trade.errorNoGroup")); return; }
    const cantidadNum = Number(cantidad);
    if (!cantidadNum || cantidadNum <= 0) { setError(t("trade.errorQuantity")); return; }

    setOperando(true);
    try {
      const orden = await api.post<OrdenResponse>(`/ordenes/${endpoint}`, {
        grupo_id: grupoId,
        ticker: ticker.trim().toUpperCase(),
        cantidad,
      });
      setMensaje(
        `${t(endpoint === "short" ? "trade.shortOpened" : "trade.shortCovered")}: ${orden.cantidad} ${orden.ticker} ${t("templates.at")} $${Number(orden.precio_ejecucion).toFixed(2)}`
      );
      const p2 = await api.get<Portafolio>(`/alumnos/${sesion.userId}/portafolio`).catch(() => null);
      if (p2) {
        setHoldings(p2.holdings || []);
        setCapitalDisponible(p2.capital_disponible);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("trade.errorExecuteOrder"));
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

  // ── Datos para el Tradex Times (landing del centro) ──
  const hoy = new Date().toLocaleDateString(lang === "en" ? "en-US" : "es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  function fechaCortaDiario(fecha: string | null) {
    if (!fecha) return t("news.today");
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return t("news.today");
    return d.toLocaleDateString(lang === "en" ? "en-US" : "es-MX", { month: "short", day: "numeric" });
  }
  const gainers = [...destacados]
    .filter((d) => d.cambio_porcentaje >= 0)
    .sort((a, b) => b.cambio_porcentaje - a.cambio_porcentaje)
    .slice(0, 5);
  const losers = [...destacados]
    .filter((d) => d.cambio_porcentaje < 0)
    .sort((a, b) => a.cambio_porcentaje - b.cambio_porcentaje)
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <h1 className="mb-4 text-2xl font-bold text-fg">{t("trade.title")}</h1>

        {activosProximos.length > 0 && (
          <Card className="mb-4 border-accent/30 bg-accent/5">
            <p className="text-sm text-fg/70">
              {t("trade.upcomingAssets")}{" "}
              {activosProximos
                .map(
                  (a) =>
                    `${a.tipo_activo} (${t("trade.fromDate")} ${new Date(a.fecha_activacion).toLocaleDateString(lang === "en" ? "en-US" : "es-MX")})`
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
            <label className="mb-1 block text-sm font-medium text-fg/70">{t("common.ticker")}</label>
            <input
              required
              value={ticker}
              onChange={(e) => {
                setTicker(e.target.value);
                setSugerenciasAbiertas(true);
              }}
              onFocus={() => setSugerenciasAbiertas(true)}
              onBlur={() => setTimeout(() => setSugerenciasAbiertas(false), 150)}
              placeholder={t("trade.searchSymbolPlaceholder")}
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
                          {s.ticker.replace("-USD", "").replace("=X", "").replace(".MX", "")}
                        </span>
                        <span className="truncate font-mono text-[11px] text-fg/50">{s.nombre}</span>
                      </span>
                      <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-fg/40">
                        {CAT_TAG_I18N[s.cat] ?? CAT_LABEL[s.cat]}
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
            {buscando ? t("trade.searching") : t("trade.searchButton")}
          </button>
        </form>

        {precio ? (
        <>
        <BarraIndices onSeleccionar={buscar} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">

          {/* ── Columna izquierda: Mi cartera ── */}
          <div className="lg:col-span-3">
            {/* Botón volver al periódico */}
            <button
              onClick={() => { setPrecio(null); setTicker(""); setHistorial([]); setNoticias([]); setFicha(null); }}
              className="mb-3 flex w-full items-center gap-2 border border-fg/15 bg-panel px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-fg/50 hover:border-accent hover:text-accent transition-colors"
            >
              <span className="text-base leading-none">⌂</span>
              {lang === "en" ? "Tradex Times" : "Tradex Times"}
            </button>

            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">{t("trade.myPortfolio")}</p>

            {capitalDisponible !== null && (
              <div className="mb-2 rounded-none border border-fg/10 bg-panel px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-fg/40">{t("trade.availableCapital")}</p>
                <p className="font-mono text-base font-bold tabular-nums text-fg">
                  ${Number(capitalDisponible).toLocaleString(lang === "en" ? "en-US" : "es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}

            {holdings.length === 0 ? (
              <div className="rounded-none border border-fg/10 bg-panel p-4">
                <p className="text-sm text-fg/40">{t("portfolio.noPositions")}</p>
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
                          {Number(h.cantidad).toFixed(4)} {t("trade.sharesShort")}
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
                    { label: "P/E", value: fmt(ficha.pe_ratio), hint: t("trade.hintPe") },
                    { label: "EPS", value: fmt(ficha.eps, "$"), hint: t("trade.hintEps") },
                    { label: "Beta", value: fmt(ficha.beta), hint: t("trade.hintBeta") },
                    { label: "Cap. Mkt", value: fmtB(ficha.market_cap), hint: t("trade.hintMarketCap") },
                    { label: "P/E Fwd", value: fmt(ficha.forward_pe), hint: t("trade.hintForwardPe") },
                    { label: t("trade.statTarget"), value: fmt(ficha.precio_objetivo, "$"), hint: t("trade.hintTarget") },
                  ];
                  const statsComun = [
                    { label: t("trade.stat52wHi"), value: fmt(ficha.max_52s, "$"), hint: t("trade.hint52wHi") },
                    { label: t("trade.stat52wLo"), value: fmt(ficha.min_52s, "$"), hint: t("trade.hint52wLo") },
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
                        "strong_buy": t("trade.recStrongBuy"), "buy": t("trade.recBuy"),
                        "hold": t("trade.recHold"), "sell": t("trade.recSell"), "strong_sell": t("trade.recStrongSell"),
                      };
                      const rec = ficha.recomendacion ? (recMap[ficha.recomendacion] ?? ficha.recomendacion) : null;
                      return (
                        <div className="mt-2 rounded-none border border-fg/10 bg-canvas px-3 py-2.5">
                          <div className="mb-1.5 flex items-center justify-between">
                            <p className="flex items-center font-mono text-[10px] uppercase tracking-widest text-fg/40">
                              {`${t("trade.analystConsensus")} · ${total} ${t("trade.analystsLabel")}`}
                              <Tooltip texto={t("trade.hintConsensus")} />
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
                            <span className="text-ganancia">▲ {a.strong_buy + a.buy} {t("trade.consensusBuy")}</span>
                            <span>{a.hold} {t("trade.consensusHold")}</span>
                            <span className="text-perdida">▼ {a.sell + a.strong_sell} {t("trade.consensusSell")}</span>
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
                      {t("trade.stat30dHi")} <Tooltip texto={t("trade.hint30dHi")} />
                    </p>
                    <p className="font-mono text-sm font-semibold tabular-nums text-fg">
                      {maximo !== null ? `$${maximo.toFixed(2)}` : "—"}
                    </p>
                  </div>
                  <div className="rounded-none border border-fg/10 bg-canvas px-3 py-2">
                    <p className="flex items-center font-mono text-[10px] uppercase tracking-widest text-fg/40">
                      {t("trade.stat30dLo")} <Tooltip texto={t("trade.hint30dLo")} />
                    </p>
                    <p className="font-mono text-sm font-semibold tabular-nums text-fg">
                      {minimo !== null ? `$${minimo.toFixed(2)}` : "—"}
                    </p>
                  </div>
                  <div className="rounded-none border border-fg/10 bg-canvas px-3 py-2">
                    <p className="flex items-center font-mono text-[10px] uppercase tracking-widest text-fg/40">
                      {t("trade.stat30dOpen")} <Tooltip texto={t("trade.hint30dOpen")} />
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
                      {t("trade.news")} · {ticker}
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
                                  {new Date(n.fecha).toLocaleDateString(lang === "en" ? "en-US" : "es-MX")}
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
                      {t("trade.placeOrder")}
                    </p>
                    <div className="flex overflow-hidden rounded-none border border-fg/20">
                      {(["mercado", "limite"] as const).map((tipo) => (
                        <button
                          key={tipo}
                          onClick={() => setTipoOrden(tipo)}
                          className={`px-3 py-1 font-mono text-[11px] uppercase ${
                            tipoOrden === tipo ? "bg-ink text-white" : "text-fg/50 hover:bg-fg/5"
                          }`}
                        >
                          {tipo === "mercado" ? t("trade.market") : t("trade.limit")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {tipoOrden === "limite" && (
                    <div className="mb-3 rounded-none border border-accent/20 bg-accent/5 px-3 py-2">
                      <p className="font-mono text-[10px] text-fg/50">
                        <Tooltip texto={t("trade.hintLimitOrder")} />
                        {" "}{t("trade.limitOrderInfo")}
                      </p>
                    </div>
                  )}

                  <label className="mb-1 block text-sm font-medium text-fg/70">{t("trade.quantity")}</label>
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
                      <label className="mb-1 block text-sm font-medium text-fg/70">{t("trade.limitPrice")}</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={precioLimite}
                        onChange={(e) => setPrecioLimite(e.target.value)}
                        placeholder={precio ? `${t("trade.currentLabel")}: $${Number(precio).toFixed(2)}` : ""}
                        className="mb-3 w-full rounded-none border border-fg/20 bg-panel px-3 py-2 font-mono text-sm"
                      />
                    </>
                  )}

                  {tipoOrden === "mercado" && (
                    <p className="mb-3 text-sm text-fg/40">
                      {t("trade.estimatedTotal")}{" "}
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
                      {tipoOrden === "limite" ? t("trade.limitBuyButton") : t("trade.buyButton")}
                    </button>
                    <button
                      onClick={() => tipoOrden === "mercado" ? ejecutarOrden("venta") : ejecutarOrdenLimite("venta")}
                      disabled={operando}
                      className="flex-1 rounded-none bg-perdida px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {tipoOrden === "limite" ? t("trade.limitSellButton") : t("trade.sellButton")}
                    </button>
                  </div>

                  {tipoOrden === "mercado" && (
                    <>
                      <div className="mt-3 border-t border-fg/10 pt-3">
                        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-fg/40">{t("trade.shortSelling")}</p>
                        <p className="mb-2 text-xs text-fg/50">
                          {t("trade.shortSellingDesc")}
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => ejecutarShort("short")}
                            disabled={operando}
                            className="flex-1 rounded-none border border-perdida bg-perdida/10 px-4 py-2 text-sm font-medium text-perdida hover:bg-perdida/20 disabled:opacity-50"
                          >
                            {t("trade.shortAction")}
                          </button>
                          <button
                            onClick={() => ejecutarShort("cubrir")}
                            disabled={operando}
                            className="flex-1 rounded-none border border-ganancia bg-ganancia/10 px-4 py-2 text-sm font-medium text-ganancia hover:bg-ganancia/20 disabled:opacity-50"
                          >
                            {t("trade.coverAction")}
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
                    {t("trade.priceAlert")}
                    <Tooltip texto={t("trade.hintPriceAlert")} />
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={condicionAlerta}
                      onChange={(e) => setCondicionAlerta(e.target.value as "gte" | "lte")}
                      className="rounded-none border border-fg/20 bg-panel px-2 py-2 font-mono text-xs text-fg"
                    >
                      <option value="lte">{t("trade.fallsTo")}</option>
                      <option value="gte">{t("trade.risesTo")}</option>
                    </select>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={precioAlerta}
                      onChange={(e) => setPrecioAlerta(e.target.value)}
                      placeholder={t("trade.price")}
                      className="flex-1 rounded-none border border-fg/20 bg-panel px-3 py-2 font-mono text-sm"
                    />
                    <button
                      onClick={crearAlerta}
                      className="rounded-none border border-fg/20 px-3 py-2 font-mono text-xs hover:bg-fg/5"
                    >
                      {t("trade.addAlert")}
                    </button>
                  </div>

                  {alertas.filter((a) => a.ticker === ticker).length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1">
                      {alertas.filter((a) => a.ticker === ticker).map((a) => (
                        <li key={a.id} className={`flex items-center justify-between rounded-none border px-2 py-1 text-xs ${a.disparada ? "border-ganancia/30 bg-ganancia/5" : "border-fg/10"}`}>
                          <span className="font-mono text-fg/70">
                            {a.condicion === "lte" ? "≤" : "≥"} ${Number(a.precio_objetivo).toFixed(2)}
                            {a.disparada && <span className="ml-2 text-ganancia">✓ {t("trade.alertTriggered")}</span>}
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
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">{t("trade.pendingOrders")}</p>
                    <ul className="flex flex-col gap-1">
                      {ordenesPendientes.filter((o) => o.estado === "pendiente").map((o) => (
                        <li key={o.id} className="flex items-center justify-between rounded-none border border-fg/10 px-2 py-1.5 text-xs">
                          <span className={`font-mono font-semibold ${o.tipo === "compra" ? "text-ganancia" : "text-perdida"}`}>
                            {t(o.tipo === "compra" ? "common.buy" : "common.sell").toUpperCase()}
                          </span>
                          <span className="font-mono text-fg">{o.ticker} · {Number(o.cantidad).toFixed(4)} {t("trade.sharesShort")}</span>
                          <span className="font-mono text-fg/60">@ ${Number(o.precio_limite).toFixed(2)}</span>
                          <button onClick={() => cancelarOrdenLimite(o.id)} className="text-fg/30 hover:text-perdida">✕</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
          </div>

          {/* ── Columna derecha: Explorar mercados ── */}
          <div className="lg:col-span-3">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-fg/40">{t("trade.explorer")}</p>

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
                    {CAT_LABELS_I18N[c.key] ?? c.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {(cargandoCat && !explorador[catActiva]) && (
                <p className="rounded-none border border-fg/10 bg-panel p-3 text-sm text-fg/40">{t("common.loading")}</p>
              )}
              {categoriasVisibles.length === 0 && (
                <p className="rounded-none border border-fg/10 bg-panel p-3 text-sm text-fg/40">
                  {t("trade.noMarketsEnabled")}
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
                        {d.ticker.replace("-USD", "").replace("=X", "").replace(".MX", "")}
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
        </>
        ) : (
          /* ── Landing: portada completa Tradex Times ── */
          <div className="border border-fg/15 bg-[#f4f1ea] p-4 text-[#1a1a1a] shadow-sm sm:p-7">
            {/* Masthead a todo lo ancho */}
            <header className="border-b-4 border-double border-[#1a1a1a] pb-0 text-center">
              <div className="flex items-center justify-between font-serif text-[10px] uppercase tracking-wide text-[#1a1a1a]/70">
                <span>{t("news.edition")}</span>
                <span className="hidden sm:inline">{t("news.tagline")}</span>
                <span className="capitalize">{hoy}</span>
              </div>
              <h1 className="mt-2 font-serif text-5xl font-black uppercase leading-none tracking-tight sm:text-7xl">
                {t("news.masthead")}
              </h1>
              {/* Barra de índices integrada debajo del título */}
              <div className="mt-2 border-t border-[#1a1a1a]/25">
                <BarraIndices onSeleccionar={buscar} variante="periodico" />
              </div>
            </header>

            {noticiasGenerales.length === 0 && destacados.length === 0 ? (
              <p className="py-16 text-center font-serif text-lg italic text-[#1a1a1a]/50">{t("common.loading")}</p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">

                {/* Riel izquierdo: tu cartera */}
                <aside className="lg:col-span-3 lg:border-r lg:border-[#1a1a1a]/25 lg:pr-5">
                  <h2 className="border-b-2 border-[#1a1a1a] pb-1 font-serif text-sm font-black uppercase tracking-widest">
                    {t("trade.myPortfolio")}
                  </h2>
                  {capitalDisponible !== null && (
                    <div className="mt-3 border-b border-[#1a1a1a]/20 pb-3">
                      <p className="font-serif text-[10px] uppercase tracking-widest text-[#1a1a1a]/60">{t("trade.availableCapital")}</p>
                      <p className="font-serif text-2xl font-black tabular-nums">
                        ${Number(capitalDisponible).toLocaleString(lang === "en" ? "en-US" : "es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  {holdings.length === 0 ? (
                    <p className="mt-3 font-serif text-sm italic text-[#1a1a1a]/50">{t("portfolio.noPositions")}</p>
                  ) : (
                    <ul className="mt-1 divide-y divide-[#1a1a1a]/15">
                      {holdings.map((h) => {
                        const pnlPct = Number(h.pnl_porcentaje);
                        const gana = Number(h.pnl) >= 0;
                        return (
                          <li key={h.ticker}>
                            <button onClick={() => buscar(h.ticker)} className="flex w-full items-center justify-between py-2 text-left hover:bg-[#1a1a1a]/5">
                              <span className="flex flex-col">
                                <span className="font-serif text-sm font-bold">{h.ticker}</span>
                                <span className="font-mono text-[10px] text-[#1a1a1a]/55">${Number(h.valor_mercado).toFixed(2)}</span>
                              </span>
                              <span className={`font-mono text-xs font-bold ${gana ? "text-[#007a2e]" : "text-[#c0271a]"}`}>
                                {gana ? "▲ +" : "▼ "}{pnlPct.toFixed(2)}%
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </aside>

                {/* Centro: editorial */}
                <div className="lg:col-span-6 lg:border-r lg:border-[#1a1a1a]/25 lg:px-5">
                  {/* Nota principal */}
                  {noticiasGenerales[0] && (
                    <a
                      href={noticiasGenerales[0].link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block border-b-2 border-[#1a1a1a] pb-5"
                    >
                      {noticiasGenerales[0].imagen && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={noticiasGenerales[0].imagen}
                          alt=""
                          className="mb-3 aspect-[16/9] w-full border border-[#1a1a1a]/20 object-cover grayscale transition group-hover:grayscale-0"
                        />
                      )}
                      <h2 className="font-serif text-3xl font-black leading-tight tracking-tight group-hover:text-[#ff6600]">
                        {noticiasGenerales[0].titulo}
                      </h2>
                      <p className="mt-2 font-serif text-[11px] uppercase tracking-wide text-[#1a1a1a]/55">
                        {noticiasGenerales[0].fuente} · {fechaCortaDiario(noticiasGenerales[0].fecha)}
                      </p>
                    </a>
                  )}

                  {/* Movers */}
                  <section className="mt-5 border-b-2 border-[#1a1a1a] pb-5">
                    <h2 className="mb-3 text-center font-serif text-lg font-bold uppercase tracking-wide">{t("news.moversTitle")}</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <DiarioMovers titulo={t("news.gainers")} items={gainers} onSel={buscar} />
                      <DiarioMovers titulo={t("news.losers")} items={losers} onSel={buscar} />
                    </div>
                  </section>

                  {/* Tus posiciones en las noticias */}
                  {noticiasPorTicker.length > 0 && (
                    <section className="mt-6">
                      <div className="border-y border-[#1a1a1a]/40 py-1 text-center">
                        <h2 className="font-serif text-xl font-black uppercase tracking-tight">{t("news.yourPositions")}</h2>
                        <p className="font-serif text-[10px] italic text-[#1a1a1a]/60">{t("news.yourPositionsDesc")}</p>
                      </div>
                      <div className="mt-4 space-y-5">
                        {noticiasPorTicker.map((bloque) => (
                          <div key={bloque.ticker} className="border-b border-[#1a1a1a]/20 pb-4">
                            <div className="mb-2 flex items-center justify-between">
                              <h3 className="font-serif text-xl font-black tracking-tight">{bloque.ticker}</h3>
                              <button
                                onClick={() => buscar(bloque.ticker)}
                                className="bg-[#1a1a1a] px-3 py-1 font-serif text-[10px] font-bold uppercase tracking-widest text-[#f4f1ea] hover:bg-[#ff6600]"
                              >
                                {t("news.tradeNow")} {bloque.ticker} →
                              </button>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {bloque.noticias.slice(0, 2).map((n, i) => (
                                <DiarioArticulo key={`${bloque.ticker}-${i}`} noticia={n} fechaCorta={fechaCortaDiario} leerT={t("news.readMore")} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Más titulares */}
                  {noticiasGenerales.length > 1 && (
                    <section className="mt-6">
                      <div className="border-y border-[#1a1a1a]/40 py-1 text-center">
                        <h2 className="font-serif text-xl font-black uppercase tracking-tight">{t("news.generalNews")}</h2>
                      </div>
                      <div className="mt-4 columns-1 gap-5 sm:columns-2 [column-fill:_balance]">
                        {noticiasGenerales.slice(1).map((n, i) => (
                          <div key={i} className="mb-5 break-inside-avoid">
                            <DiarioArticulo noticia={n} fechaCorta={fechaCortaDiario} leerT={t("news.readMore")} grande />
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                {/* Riel derecho: explorador de mercados */}
                <aside className="lg:col-span-3">
                  <h2 className="border-b-2 border-[#1a1a1a] pb-1 font-serif text-sm font-black uppercase tracking-widest">
                    {t("trade.explorer")}
                  </h2>
                  {categoriasVisibles.length > 1 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {categoriasVisibles.map((c) => (
                        <button
                          key={c.key}
                          onClick={() => { setCatActiva(c.key); cargarCategoria(c.key); }}
                          className={`border px-2 py-1 font-serif text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            catActiva === c.key
                              ? "border-[#1a1a1a] bg-[#1a1a1a] text-[#f4f1ea]"
                              : "border-[#1a1a1a]/30 text-[#1a1a1a]/60 hover:text-[#1a1a1a]"
                          }`}
                        >
                          {CAT_LABELS_I18N[c.key] ?? c.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <ul className="mt-3 divide-y divide-[#1a1a1a]/15">
                    {(cargandoCat && !explorador[catActiva]) && (
                      <li className="py-2 font-serif text-sm italic text-[#1a1a1a]/50">{t("common.loading")}</li>
                    )}
                    {categoriasVisibles.length === 0 && (
                      <li className="py-2 font-serif text-sm italic text-[#1a1a1a]/50">{t("trade.noMarketsEnabled")}</li>
                    )}
                    {(explorador[catActiva] || []).map((d) => {
                      const sube = d.cambio_porcentaje >= 0;
                      const sparkData = (d.sparkline || []).map(Number);
                      return (
                        <li key={d.ticker}>
                          <button onClick={() => buscar(d.ticker)} className="flex w-full items-center gap-2 py-2 text-left hover:bg-[#1a1a1a]/5">
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate font-serif text-sm font-bold">
                                {d.ticker.replace("-USD", "").replace("=X", "").replace(".MX", "")}
                              </span>
                              <span className="font-mono text-[10px] text-[#1a1a1a]/55">${Number(d.precio).toFixed(2)}</span>
                            </span>
                            {sparkData.length > 1 && <Sparkline data={sparkData} subiendo={sube} />}
                            <span className={`shrink-0 font-mono text-xs font-bold ${sube ? "text-[#007a2e]" : "text-[#c0271a]"}`}>
                              {sube ? "▲" : "▼"} {Math.abs(d.cambio_porcentaje).toFixed(2)}%
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </aside>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}

function DiarioMovers({
  titulo,
  items,
  onSel,
}: {
  titulo: string;
  items: Destacado[];
  onSel: (t: string) => void;
}) {
  return (
    <div className="border border-[#1a1a1a]/30 p-3">
      <h3 className="mb-2 border-b border-[#1a1a1a]/30 pb-1 font-serif text-sm font-bold uppercase tracking-wider">{titulo}</h3>
      <ul className="divide-y divide-[#1a1a1a]/10">
        {items.length === 0 && <li className="py-2 font-serif text-sm italic text-[#1a1a1a]/40">—</li>}
        {items.map((m) => {
          const sube = m.cambio_porcentaje >= 0;
          return (
            <li key={m.ticker}>
              <button
                onClick={() => onSel(m.ticker)}
                className="flex w-full items-center justify-between py-1.5 text-left hover:bg-[#1a1a1a]/5"
              >
                <span className="font-serif text-sm font-bold">
                  {m.ticker.replace("-USD", "").replace("=X", "").replace(".MX", "")}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#1a1a1a]/70">${Number(m.precio).toFixed(2)}</span>
                  <span className={`font-mono text-xs font-bold ${sube ? "text-[#007a2e]" : "text-[#c0271a]"}`}>
                    {sube ? "▲" : "▼"} {Math.abs(m.cambio_porcentaje).toFixed(2)}%
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DiarioArticulo({
  noticia,
  fechaCorta,
  leerT,
  grande,
}: {
  noticia: Noticia;
  fechaCorta: (f: string | null) => string;
  leerT: string;
  grande?: boolean;
}) {
  return (
    <a href={noticia.link} target="_blank" rel="noopener noreferrer" className="group block">
      {noticia.imagen && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={noticia.imagen}
          alt=""
          className="mb-2 aspect-[16/9] w-full border border-[#1a1a1a]/20 object-cover grayscale transition group-hover:grayscale-0"
        />
      )}
      <h4
        className={`font-serif font-bold leading-snug text-[#1a1a1a] group-hover:text-[#ff6600] ${
          grande ? "text-base" : "text-sm"
        }`}
      >
        {noticia.titulo}
      </h4>
      <p className="mt-1 font-serif text-[10px] uppercase tracking-wide text-[#1a1a1a]/55">
        {noticia.fuente} · {fechaCorta(noticia.fecha)}
      </p>
      <span className="mt-1 inline-block font-serif text-[10px] italic text-[#ff6600] underline opacity-0 transition group-hover:opacity-100">
        {leerT} →
      </span>
    </a>
  );
}
