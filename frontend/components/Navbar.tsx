"use client";

import { useRouter } from "next/navigation";
import { cerrarSesion, obtenerSesion } from "@/lib/auth";

export default function Navbar() {
  const router = useRouter();
  const sesion = obtenerSesion();

  function salir() {
    cerrarSesion();
    router.push("/login");
  }

  return (
    <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <span className="text-xl font-bold text-slate-900">Tradex</span>
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
