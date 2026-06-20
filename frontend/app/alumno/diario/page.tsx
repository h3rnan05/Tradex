"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api, ApiError } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import ErrorState from "@/components/ErrorState";

interface Noticia {
  titulo: string;
  fuente: string;
  link: string;
  fecha: string | null;
  imagen?: string | null;
}

interface Holding {
  ticker: string;
}

interface Portafolio {
  holdings: Holding[];
}

interface Mover {
  ticker: string;
  precio: string;
  cambio_porcentaje: number;
}

interface NoticiasTicker {
  ticker: string;
  noticias: Noticia[];
}

const MAX_TICKERS = 5;

export default function DiarioPage() {
  const { t, lang } = useLanguage();
  const [generales, setGenerales] = useState<Noticia[]>([]);
  const [movers, setMovers] = useState<Mover[]>([]);
  const [porTicker, setPorTicker] = useState<NoticiasTicker[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    const sesion = obtenerSesion();
    if (!sesion) {
      setError(t("error.sessionNotFound"));
      setCargando(false);
      return;
    }
    setError(null);
    setCargando(true);
    try {
      const [gen, mov, portafolio] = await Promise.all([
        api.get<{ noticias: Noticia[] }>("/precios/noticias-generales").catch(() => ({ noticias: [] })),
        api.get<Mover[]>("/precios/trending").catch(() => [] as Mover[]),
        api.get<Portafolio>(`/alumnos/${sesion.userId}/portafolio`).catch(() => null),
      ]);
      setGenerales(gen.noticias ?? []);
      setMovers(Array.isArray(mov) ? mov : []);

      const tickers = Array.from(
        new Set((portafolio?.holdings ?? []).map((h) => h.ticker))
      ).slice(0, MAX_TICKERS);

      const noticiasTicker = await Promise.all(
        tickers.map((tk) =>
          api
            .get<NoticiasTicker>(`/precios/${tk}/noticias`)
            .catch(() => ({ ticker: tk, noticias: [] as Noticia[] }))
        )
      );
      setPorTicker(noticiasTicker.filter((n) => n.noticias.length > 0));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("news.loadError"));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hoy = new Date().toLocaleDateString(lang === "es" ? "es-MX" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function fechaCorta(fecha: string | null) {
    if (!fecha) return t("news.today");
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return t("news.today");
    return d.toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { month: "short", day: "numeric" });
  }

  const gainers = movers.filter((m) => m.cambio_porcentaje >= 0).slice(0, 5);
  const losers = movers.filter((m) => m.cambio_porcentaje < 0).slice(0, 5);

  return (
    <main className="min-h-screen bg-[#f4f1ea]">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 py-6 text-[#1a1a1a]">
        {/* ── Masthead ─────────────────────────────────────── */}
        <header className="border-b-4 border-double border-[#1a1a1a] pb-3 text-center">
          <div className="flex items-center justify-between font-serif text-[10px] uppercase tracking-wide text-[#1a1a1a]/70">
            <span>{t("news.edition")}</span>
            <span className="hidden sm:inline">{t("news.tagline")}</span>
            <span>$0.00</span>
          </div>
          <h1 className="mt-1 font-serif text-4xl font-black uppercase leading-none tracking-tight sm:text-6xl">
            {t("news.masthead")}
          </h1>
          <div className="mt-2 flex items-center justify-center gap-3 border-t border-[#1a1a1a]/30 pt-2 font-serif text-[11px] uppercase tracking-widest text-[#1a1a1a]/70">
            <span className="capitalize">{hoy}</span>
          </div>
        </header>

        {error && (
          <div className="mt-6">
            <ErrorState message={error} onRetry={cargar} />
          </div>
        )}

        {cargando ? (
          <p className="py-16 text-center font-serif text-lg italic text-[#1a1a1a]/50">{t("common.loading")}</p>
        ) : (
          <>
            {/* ── Market movers (cómo cerró el mercado) ──────── */}
            <section className="mt-5 border-b-2 border-[#1a1a1a] pb-5">
              <h2 className="mb-3 text-center font-serif text-xl font-bold uppercase tracking-wide">
                {t("news.moversTitle")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <MoversColumn titulo={t("news.gainers")} items={gainers} fechaT={t("news.tradeNow")} />
                <MoversColumn titulo={t("news.losers")} items={losers} fechaT={t("news.tradeNow")} />
              </div>
            </section>

            {/* ── Tus posiciones en las noticias ─────────────── */}
            <section className="mt-6">
              <div className="border-y border-[#1a1a1a]/40 py-1 text-center">
                <h2 className="font-serif text-2xl font-black uppercase tracking-tight">{t("news.yourPositions")}</h2>
                <p className="font-serif text-[11px] italic text-[#1a1a1a]/60">{t("news.yourPositionsDesc")}</p>
              </div>

              {porTicker.length === 0 ? (
                <p className="py-8 text-center font-serif italic text-[#1a1a1a]/50">{t("news.noHoldings")}</p>
              ) : (
                <div className="mt-5 space-y-6">
                  {porTicker.map((bloque) => (
                    <div key={bloque.ticker} className="border-b border-[#1a1a1a]/20 pb-5">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-serif text-2xl font-black tracking-tight">{bloque.ticker}</h3>
                        <Link
                          href={`/alumno/operar?t=${encodeURIComponent(bloque.ticker)}`}
                          className="bg-[#1a1a1a] px-4 py-1.5 font-serif text-[11px] font-bold uppercase tracking-widest text-[#f4f1ea] hover:bg-[#ff6600]"
                        >
                          {t("news.tradeNow")} {bloque.ticker} →
                        </Link>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        {bloque.noticias.slice(0, 3).map((n, i) => (
                          <ArticuloCard key={`${bloque.ticker}-${i}`} noticia={n} fechaCorta={fechaCorta} leerT={t("news.readMore")} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Titulares generales ────────────────────────── */}
            <section className="mt-6">
              <div className="border-y border-[#1a1a1a]/40 py-1 text-center">
                <h2 className="font-serif text-2xl font-black uppercase tracking-tight">{t("news.generalNews")}</h2>
              </div>
              {generales.length === 0 ? (
                <p className="py-8 text-center font-serif italic text-[#1a1a1a]/50">{t("news.noNews")}</p>
              ) : (
                <div className="mt-5 columns-1 gap-6 sm:columns-2 lg:columns-3 [column-fill:_balance]">
                  {generales.map((n, i) => (
                    <div key={i} className="mb-6 break-inside-avoid">
                      <ArticuloCard noticia={n} fechaCorta={fechaCorta} leerT={t("news.readMore")} grande />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <Footer />
    </main>
  );
}

function MoversColumn({ titulo, items, fechaT }: { titulo: string; items: Mover[]; fechaT: string }) {
  return (
    <div className="border border-[#1a1a1a]/30 p-3">
      <h3 className="mb-2 border-b border-[#1a1a1a]/30 pb-1 font-serif text-sm font-bold uppercase tracking-wider">{titulo}</h3>
      <ul className="divide-y divide-[#1a1a1a]/10">
        {items.length === 0 && <li className="py-2 font-serif text-sm italic text-[#1a1a1a]/40">—</li>}
        {items.map((m) => {
          const sube = m.cambio_porcentaje >= 0;
          return (
            <li key={m.ticker}>
              <Link
                href={`/alumno/operar?t=${encodeURIComponent(m.ticker)}`}
                className="flex items-center justify-between py-1.5 hover:bg-[#1a1a1a]/5"
                title={`${fechaT} ${m.ticker}`}
              >
                <span className="font-serif text-sm font-bold">{m.ticker}</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#1a1a1a]/70">${Number(m.precio).toFixed(2)}</span>
                  <span className={`font-mono text-xs font-bold ${sube ? "text-[#007a2e]" : "text-[#c0271a]"}`}>
                    {sube ? "▲" : "▼"} {Math.abs(m.cambio_porcentaje).toFixed(2)}%
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ArticuloCard({
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
          grande ? "text-lg" : "text-base"
        }`}
      >
        {noticia.titulo}
      </h4>
      <p className="mt-1 font-serif text-[11px] uppercase tracking-wide text-[#1a1a1a]/55">
        {noticia.fuente} · {fechaCorta(noticia.fecha)}
      </p>
      <span className="mt-1 inline-block font-serif text-[11px] italic text-[#ff6600] underline opacity-0 transition group-hover:opacity-100">
        {leerT} →
      </span>
    </a>
  );
}
