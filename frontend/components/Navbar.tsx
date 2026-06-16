"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cerrarSesion, obtenerSesion } from "@/lib/auth";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const sesion = obtenerSesion();

  function salir() {
    cerrarSesion();
    router.push("/login");
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
    <nav className="border-b border-term-green/20 bg-ink shadow-[0_1px_12px_rgba(0,255,140,0.08)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-10">
          <span className="font-mono text-sm font-bold uppercase tracking-widest text-white drop-shadow-[0_0_6px_rgba(0,255,140,0.6)]">
            <span className="text-term-green">■</span> Tradex
          </span>
          {sesion && (
            <div className="flex items-center gap-6">
              {enlaces.map((enlace) => {
                const activo = pathname?.startsWith(enlace.href);
                return (
                  <Link
                    key={enlace.href}
                    href={enlace.href}
                    className={`font-mono text-xs font-medium uppercase tracking-wider transition-colors ${
                      activo ? "text-accent" : "text-white/50 hover:text-white"
                    }`}
                  >
                    {enlace.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        {sesion && (
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-white/50">
              {sesion.nombre} · {sesion.rol === "maestro" ? "Maestro" : "Alumno"}
            </span>
            <button
              onClick={salir}
              className="rounded-md border border-white/20 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-white/70 hover:bg-panel/10"
            >
              Salir
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
