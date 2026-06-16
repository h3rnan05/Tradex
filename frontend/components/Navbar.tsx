"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cerrarSesion, obtenerSesion } from "@/lib/auth";

export default function Navbar() {
  const router = useRouter();
  const sesion = obtenerSesion();

  function salir() {
    cerrarSesion();
    router.push("/login");
  }

  const enlaces =
    sesion?.rol === "maestro"
      ? [{ href: "/maestro/grupos", label: "Mis grupos" }]
      : [
          { href: "/alumno/portafolio", label: "Portafolio" },
          { href: "/alumno/operar", label: "Operar" },
          { href: "/alumno/historial", label: "Historial" },
          { href: "/alumno/ranking", label: "Ranking" },
        ];

  return (
    <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center gap-8">
        <span className="text-xl font-bold text-slate-900">Tradex</span>
        {sesion && (
          <div className="flex items-center gap-4">
            {enlaces.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                {enlace.label}
              </Link>
            ))}
          </div>
        )}
      </div>
      {sesion && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            {sesion.nombre} ({sesion.rol === "maestro" ? "Maestro" : "Alumno"})
          </span>
          <button
            onClick={salir}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </nav>
  );
}
