"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cerrarSesion, obtenerSesion } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useRetoActivo } from "@/lib/retoContext";
import { BarraNivelHUD } from "@/components/BarraNivel";
import { getGrupoActivo } from "@/lib/clase";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const sesion = obtenerSesion();
  const [comando, setComando] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [masAbierto, setMasAbierto] = useState(false);
  const { lang, t, setLang } = useLanguage();
  const { reto } = useRetoActivo();

  // Durante un reto, la interfaz del alumno ES el reto: ocultamos las pestañas
  // y el buscador que llevan fuera de él para no confundir.
  const enReto = sesion?.rol === "alumno" && !!reto;

  function salir() {
    cerrarSesion();
    router.push("/login");
  }

  function ejecutarComando(e: React.FormEvent) {
    e.preventDefault();
    const ticker = comando.trim().toUpperCase();
    if (!ticker) return;
    router.push(`/alumno/operar?t=${encodeURIComponent(ticker)}`);
    setComando("");
    setMenuAbierto(false);
  }

  const enlaces =
    sesion?.rol === "admin"
      ? [
          { href: "/admin/dashboard", label: t("nav.dashboard") },
          { href: "/admin/maestros", label: t("nav.teachers") },
          { href: "/admin/usuarios", label: t("nav.users") },
          { href: "/admin/ranking", label: t("nav.globalRanking") },
        ]
      : sesion?.rol === "sponsor"
      ? [{ href: "/sponsor/dashboard", label: t("nav.dashboard") }]
      : sesion?.rol === "maestro"
      ? [{ href: "/maestro/grupos", label: t("nav.groups") }]
      : (enReto
          ? // En modo reto solo quedan la interfaz del reto y el ranking.
            [
              { href: "/alumno/portafolio", label: t("nav.portfolio") },
              { href: "/alumno/ranking", label: t("nav.ranking") },
            ]
          : [
              { href: "/alumno/portafolio", label: t("nav.portfolio") },
              { href: "/alumno/mercados", label: t("nav.markets") },
              { href: "/alumno/operar", label: t("nav.trade") },
              { href: "/alumno/terminal", label: t("nav.terminal") },
              { href: "/alumno/retos", label: t("nav.challenges") },
              { href: "/alumno/ranking", label: t("nav.ranking") },
              { href: "/alumno/historial", label: t("nav.history") },
              { href: "/alumno/plantillas", label: t("nav.templates") },
              { href: "/alumno/clase", label: t("nav.class") },
            ]);

  const rolLabel =
    sesion?.rol === "maestro"
      ? t("nav.teacher")
      : sesion?.rol === "admin"
      ? t("nav.admin")
      : sesion?.rol === "sponsor"
      ? t("nav.sponsor")
      : t("nav.student");

  return (
    <header className="sticky top-0 z-40 border-b-2 border-accent bg-canvas">
      {/* Main bar */}
      <div className="mx-auto flex h-12 max-w-[1600px] items-center px-4">
        {/* Logo */}
        <span className="flex shrink-0 items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-widest text-accent">
          <span className="inline-block size-2 bg-accent" aria-hidden />
          Tradex
        </span>

        {/* Desktop nav */}
        {sesion && (
          <>
            <span className="mx-2 hidden h-4 w-px shrink-0 bg-fg/20 md:block" aria-hidden />
            <nav className="hidden flex-1 min-w-0 items-center md:flex">
              {(sesion.rol === "alumno" && !enReto ? enlaces.slice(0, 4) : enlaces).map((enlace) => {
                const activo = pathname?.startsWith(enlace.href);
                return (
                  <Link
                    key={enlace.href}
                    href={enlace.href}
                    className={`flex flex-1 h-12 items-center justify-center font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                      activo ? "bg-accent text-black" : "text-fg/60 hover:bg-fg/5 hover:text-fg"
                    }`}
                  >
                    {enlace.label}
                  </Link>
                );
              })}

              {/* "Más" dropdown for alumno tabs 5-9 */}
              {sesion.rol === "alumno" && !enReto && enlaces.length > 4 && (
                <div className="relative flex-1">
                  <button
                    onClick={() => setMasAbierto(!masAbierto)}
                    className={`flex w-full h-12 items-center justify-center gap-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                      masAbierto || enlaces.slice(4).some(e => pathname?.startsWith(e.href))
                        ? "bg-accent text-black"
                        : "text-fg/60 hover:bg-fg/5 hover:text-fg"
                    }`}
                  >
                    {t("nav.more")}
                    <span className="text-[9px] leading-none ml-0.5">{masAbierto ? "▲" : "▼"}</span>
                  </button>
                  {masAbierto && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setMasAbierto(false)} />
                      <div className="absolute left-0 top-full z-40 min-w-[140px] border border-fg/20 bg-canvas shadow-lg">
                        {enlaces.slice(4).map((enlace) => {
                          const activo = pathname?.startsWith(enlace.href);
                          return (
                            <Link
                              key={enlace.href}
                              href={enlace.href}
                              onClick={() => setMasAbierto(false)}
                              className={`flex items-center px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors border-b border-fg/5 last:border-b-0 ${
                                activo ? "bg-accent text-black" : "text-fg/60 hover:bg-fg/5 hover:text-fg"
                              }`}
                            >
                              {enlace.label}
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </nav>
          </>
        )}

        {/* Desktop search */}
        {sesion && sesion.rol === "alumno" && !enReto && (
          <form onSubmit={ejecutarComando} className="ml-3 hidden shrink-0 items-center md:flex">
            <div className="flex w-28 items-center border border-fg/20 bg-panel">
              <span className="px-1.5 font-mono text-[11px] text-fg/40">$</span>
              <input
                value={comando}
                onChange={(e) => setComando(e.target.value)}
                placeholder={t("nav.searchPlaceholder")}
                className="w-full bg-transparent py-1.5 font-mono text-[11px] uppercase tracking-wide text-fg outline-none placeholder:text-fg/30"
              />
              <button
                type="submit"
                className="shrink-0 bg-accent px-2 py-1.5 font-mono text-[10px] font-bold uppercase text-black"
              >
                {t("nav.go")}
              </button>
            </div>
          </form>
        )}

        {/* Desktop user info */}
        {sesion && (
          <div className="ml-auto hidden shrink-0 items-center gap-3 whitespace-nowrap pl-3 md:flex">
            {sesion.rol === "alumno" && (
              <>
                <BarraNivelHUD grupoId={getGrupoActivo()} />
                <span className="h-6 w-px shrink-0 bg-fg/15" aria-hidden />
              </>
            )}
            <Link href="/perfil" className="shrink-0 font-mono text-[11px] text-fg/60 hover:text-fg">
              {sesion.nombre} · {rolLabel}
            </Link>
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              title={lang === "es" ? "Switch to English" : "Cambiar a Español"}
              className="flex shrink-0 items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-widest text-fg/50 hover:text-fg transition-colors"
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${lang === "es" ? "bg-fg/25" : "bg-accent"}`} />
              {lang === "es" ? "EN" : "ES"}
            </button>
            <button
              onClick={salir}
              className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-fg/40 hover:text-fg/80 transition-colors"
            >
              {t("nav.logout")}
            </button>
          </div>
        )}

        {/* Mobile: hamburger */}
        {sesion && (
          <button
            className="ml-auto flex items-center justify-center p-2 text-fg md:hidden"
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-label="Menú"
          >
            <span className="text-xl leading-none">{menuAbierto ? "✕" : "☰"}</span>
          </button>
        )}
      </div>

      {/* Mobile menu */}
      {menuAbierto && sesion && (
        <div className="border-t border-fg/10 bg-canvas md:hidden">
          <nav className="flex flex-col">
            {enlaces.map((enlace) => {
              const activo = pathname?.startsWith(enlace.href);
              return (
                <Link
                  key={enlace.href}
                  href={enlace.href}
                  onClick={() => setMenuAbierto(false)}
                  className={`border-b border-fg/5 px-5 py-4 font-mono text-[13px] font-semibold uppercase tracking-wider transition-colors ${
                    activo ? "bg-accent text-black" : "text-fg/70 hover:bg-fg/5"
                  }`}
                >
                  {enlace.label}
                </Link>
              );
            })}

            {/* Mobile search */}
            {sesion.rol === "alumno" && !enReto && (
              <form onSubmit={ejecutarComando} className="border-b border-fg/5 px-5 py-3">
                <div className="flex items-center border border-fg/20 bg-panel">
                  <span className="px-2 font-mono text-[11px] text-fg/40">$</span>
                  <input
                    value={comando}
                    onChange={(e) => setComando(e.target.value)}
                    placeholder={t("nav.searchMobilePlaceholder")}
                    className="flex-1 bg-transparent py-2 font-mono text-[12px] uppercase tracking-wide text-fg outline-none placeholder:text-fg/30"
                  />
                  <button
                    type="submit"
                    className="shrink-0 bg-accent px-3 py-2 font-mono text-[10px] font-bold uppercase text-black"
                  >
                    {t("nav.go")}
                  </button>
                </div>
              </form>
            )}

            {/* Mobile user + salir */}
            <div className="flex items-center justify-between px-5 py-4">
              <span className="font-mono text-[12px] text-fg/50">
                {sesion.nombre} · {rolLabel}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLang(lang === "es" ? "en" : "es")}
                  className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-widest text-fg/50 px-3 py-2"
                >
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${lang === "es" ? "bg-fg/25" : "bg-accent"}`} />
                  {lang === "es" ? "EN" : "ES"}
                </button>
                <button
                  onClick={salir}
                  className="border border-fg/20 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-fg/50"
                >
                  {t("nav.logout")}
                </button>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
