"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cerrarSesion, obtenerSesion } from "@/lib/auth";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const sesion = obtenerSesion();
  const [comando, setComando] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false);

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
          { href: "/admin/dashboard", label: "Dashboard" },
          { href: "/admin/maestros", label: "Maestros" },
          { href: "/admin/usuarios", label: "Usuarios" },
          { href: "/admin/ranking", label: "Ranking Global" },
        ]
      : sesion?.rol === "sponsor"
      ? [{ href: "/sponsor/dashboard", label: "Dashboard" }]
      : sesion?.rol === "maestro"
      ? [{ href: "/maestro/grupos", label: "Grupos" }]
      : [
          { href: "/alumno/portafolio", label: "Portafolio" },
          { href: "/alumno/clase", label: "Clase" },
          { href: "/alumno/operar", label: "Operar" },
          { href: "/alumno/mercados", label: "Mercados" },
          { href: "/alumno/plantillas", label: "Plantillas" },
          { href: "/alumno/retos", label: "Retos" },
          { href: "/alumno/historial", label: "Historial" },
          { href: "/alumno/ranking", label: "Ranking" },
        ];

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
        {sesion && sesion.rol === "alumno" && (
          <form onSubmit={ejecutarComando} className="ml-3 hidden items-center md:flex">
            <div className="flex w-36 items-center border border-fg/20 bg-panel">
              <span className="px-1.5 font-mono text-[11px] text-fg/40">$</span>
              <input
                value={comando}
                onChange={(e) => setComando(e.target.value)}
                placeholder="AAPL"
                className="w-full bg-transparent py-1.5 font-mono text-[11px] uppercase tracking-wide text-fg outline-none placeholder:text-fg/30"
              />
              <button
                type="submit"
                className="shrink-0 bg-accent px-2 py-1.5 font-mono text-[10px] font-bold uppercase text-black"
              >
                GO
              </button>
            </div>
          </form>
        )}

        {/* Desktop user info */}
        {sesion && (
          <div className="ml-auto hidden items-center gap-3 border-l border-fg/15 pl-3 md:flex">
            <Link href="/perfil" className="font-mono text-[11px] text-fg/60 hover:text-fg">
              {sesion.nombre} · {sesion.rol === "maestro" ? "Maestro" : sesion.rol === "admin" ? "Admin" : sesion.rol === "sponsor" ? "Patrocinador" : "Alumno"}
            </Link>
            <button
              onClick={salir}
              className="border border-fg/20 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg/70 hover:bg-fg/5"
            >
              Salir
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
            {sesion.rol === "alumno" && (
              <form onSubmit={ejecutarComando} className="border-b border-fg/5 px-5 py-3">
                <div className="flex items-center border border-fg/20 bg-panel">
                  <span className="px-2 font-mono text-[11px] text-fg/40">$</span>
                  <input
                    value={comando}
                    onChange={(e) => setComando(e.target.value)}
                    placeholder="Buscar ticker — AAPL"
                    className="flex-1 bg-transparent py-2 font-mono text-[12px] uppercase tracking-wide text-fg outline-none placeholder:text-fg/30"
                  />
                  <button
                    type="submit"
                    className="shrink-0 bg-accent px-3 py-2 font-mono text-[10px] font-bold uppercase text-black"
                  >
                    GO
                  </button>
                </div>
              </form>
            )}

            {/* Mobile user + salir */}
            <div className="flex items-center justify-between px-5 py-4">
              <span className="font-mono text-[12px] text-fg/50">
                {sesion.nombre} · {sesion.rol === "maestro" ? "Maestro" : sesion.rol === "admin" ? "Admin" : sesion.rol === "sponsor" ? "Patrocinador" : "Alumno"}
              </span>
              <button
                onClick={salir}
                className="border border-fg/20 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-fg/70"
              >
                Salir
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
