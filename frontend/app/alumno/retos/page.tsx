"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/primitives";
import { api, ApiError } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";

interface Portafolio {
  grupo_id: string;
}

interface Reto {
  id: string;
  nombre: string;
  escenario_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  capital_inicial: string;
}

export default function RetosPage() {
  const [retos, setRetos] = useState<Reto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion) return;
    api
      .get<Portafolio>(`/alumnos/${sesion.userId}/portafolio`)
      .then((portafolio) => api.get<Reto[]>(`/grupos/${portafolio.grupo_id}/retos`))
      .then(setRetos)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Error al cargar los retos"));
  }, []);

  function estaActivo(reto: Reto) {
    const ahora = Date.now();
    return ahora >= new Date(reto.fecha_inicio).getTime() && ahora < new Date(reto.fecha_fin).getTime();
  }

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="mb-2 text-2xl font-bold text-fg">Retos cronometrados</h1>
        <p className="mb-6 text-sm text-fg/40">
          Compite contra tus compañeros usando un escenario histórico real, comprimido en el tiempo del reto.
        </p>

        {error && <p className="mb-4 text-sm text-perdida">{error}</p>}

        {!retos ? (
          <p className="text-fg/40">Cargando...</p>
        ) : retos.length === 0 ? (
          <Card>
            <p className="text-fg/40">Tu maestro todavía no ha lanzado ningún reto.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {retos.map((r) => (
              <Link key={r.id} href={`/alumno/retos/${r.id}`}>
                <Card className="hover:border-accent">
                  <div className="mb-1 flex items-center justify-between">
                    <h2 className="font-mono text-sm font-bold uppercase tracking-wide text-fg">{r.nombre}</h2>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wide ${
                        estaActivo(r) ? "text-ganancia" : "text-fg/40"
                      }`}
                    >
                      {estaActivo(r) ? "En curso" : "Finalizado"}
                    </span>
                  </div>
                  <p className="text-xs text-fg/40">Escenario: {r.escenario_id}</p>
                  <p className="text-xs text-fg/40">
                    Termina: {new Date(r.fecha_fin).toLocaleString("es-MX")}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
