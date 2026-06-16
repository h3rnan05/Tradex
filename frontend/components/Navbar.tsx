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
  }

  const enlaces =
    sesion?.rol === "maestro"
      ? [{ href: "/maestro/grupos", label: "Grupos" }]
      : [
          { href: "/alumno/portafolio", label: "Portafolio" },
          { href: "/alumno/operar", label: "Operar" },
          { href: "/alumno/plantillas", label: "Plantillas" },
          { href: "/alumno/retos", label: "Retos" },
          { href: "/alumno/historial", label: "Historial" },
          { href: "/alumno/ranking", label: "Ranking" },
        ];

  return (
    <header className="sticky top-0 z-40 border-b-2 border-accent bg-canvas">
      <div className="mx-auto flex h-12 max-w-6xl items-center px-6">
        <span className="flex shrink-0 items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-widest text-accent">
          <span className="inline-block size-2 bg-accent" aria-hidden />
          Tradex
        </span>

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

        {sesion && sesion.rol === "alumno" && (
          <form onSubmit={ejecutarComando} className="ml-4 hidden flex-1 items-center justify-center md:flex">
            <div className="flex w-full max-w-xs items-center border border-fg/20 bg-panel">
              <span className="px-2 font-mono text-[11px] text-fg/40">$</span>
              <input
                value={comando}
                onChange={(e) => setComando(e.target.value)}
                placeholder="AAPL <GO>"
                className="w-full bg-transparent py-1.5 font-mono text-[12px] uppercase tracking-wide text-fg outline-none placeholder:text-fg/30"
              />
              <button
                type="submit"
                className="shrink-0 bg-accent px-2 py-1.5 font-mono text-[10px] font-bold uppercase text-black"
              >
                Go
              </button>
            </div>
          </form>
        )}

        {sesion && (
          <div className="ml-auto flex items-center gap-3 border-l border-fg/15 pl-3">
            <span className="font-mono text-[11px] text-fg/60">
              {sesion.nombre} · {sesion.rol === "maestro" ? "Maestro" : "Alumno"}
            </span>
            <button
              onClick={salir}
              className="rounded-none border border-fg/20 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg/70 hover:bg-fg/5"
            >
              Salir
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
