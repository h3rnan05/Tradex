"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cerrarSesion, obtenerSesion } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useRetoActivo } from "@/lib/retoContext";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const sesion = obtenerSesion();
  const [comando, setComando] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false);
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
              { href: "/alumno/operar", label: t("nav.trade") },
              { href: "/alumno/terminal", label: t("nav.terminal") },
              { href: "/alumno/historial", label: t("nav.history") },
              { href: "/alumno/ranking", label: t("nav.ranking") },
              { href: "/alumno/mercados", label: t("nav.markets") },
              { href: "/alumno/clase", label: t("nav.class") },
              { href: "/alumno/plantillas", label: t("nav.templates") },
              { href: "/alumno/retos", label: t("nav.challenges") },
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
      <div className="mx-auto flex h-12 max-w-6xl items-center px-4">
        {/* Logo */}
        <span className="flex shrink-0 items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-widest text-accent">
          <span className="inline-block size-2 bg-accent" aria-hidden />
          Tradex
        </span>

        {/* Desktop nav */}
        {sesion && (
          <>
            <span className="mx-3 hidden h-4 w-px bg-fg/20 md:block" aria-hidden />
            <nav className="hidden items-center md:flex">
              {enlaces.map((enlace) => {
                const activo = pathname?.startsWith(enlace.href);
                return (
                  <Link
                    key={enlace.href}
                    href={enlace.href}
                    className={`inline-flex h-12 items-center px-3 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                      activo ? "bg-accent text-black" : "text-fg/60 hover:bg-fg/5 hover:text-fg"
                    }`}
                  >
                    {enlace.label}
                  </Link>
                );
              })}
            </nav>
          </>
        )}

        {/* Desktop search */}
        {sesion && sesion.rol === "alumno" && !enReto && (
          <form onSubmit={ejecutarComando} className="ml-3 hidden items-center md:flex">
            <div className="flex w-36 items-center border border-fg/20 bg-panel">
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
          <div className="ml-auto hidden items-center gap-3 border-l border-fg/15 pl-3 md:flex">
            <Link href="/perfil" className="font-mono text-[11px] text-fg/60 hover:text-fg">
              {sesion.nombre} · {rolLabel}
            </Link>
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              title={lang === "es" ? "Switch to English" : "Cambiar a Español"}
              className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-widest text-fg/50 hover:text-fg transition-colors"
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${lang === "es" ? "bg-fg/25" : "bg-accent"}`} />
              {lang === "es" ? "EN" : "ES"}
            </button>
            <button
              onClick={salir}
              className="font-mono text-[11px] uppercase tracking-wider text-fg/40 hover:text-fg/80 transition-colors"
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
