"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";

export interface RetoActivoInfo {
  id: string;
  grupo_id: string;
  escenario_id: string | null;
  activos_permitidos: string[] | null;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  capital_inicial: string;
}

interface RetoCtx {
  reto: RetoActivoInfo | null;
  cargando: boolean;
  refrescar: () => void;
}

const Ctx = createContext<RetoCtx>({ reto: null, cargando: true, refrescar: () => {} });

/**
 * Provee el reto activo del alumno (uno que ya empezó y no ha terminado).
 * Cuando hay reto activo, la interfaz del alumno entra en "modo reto".
 */
export function RetoProvider({ children }: { children: React.ReactNode }) {
  const [reto, setReto] = useState<RetoActivoInfo | null>(null);
  const [cargando, setCargando] = useState(true);

  function refrescar() {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== "alumno") {
      setReto(null);
      setCargando(false);
      return;
    }
    api
      .get<RetoActivoInfo | null>("/retos/activo")
      .then((r) => setReto(r ?? null))
      .catch(() => setReto(null))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    refrescar();
    // Revisar cada minuto por si un reto empieza o termina.
    const interval = setInterval(refrescar, 60000);
    return () => clearInterval(interval);
  }, []);

  return <Ctx.Provider value={{ reto, cargando, refrescar }}>{children}</Ctx.Provider>;
}

export function useRetoActivo() {
  return useContext(Ctx);
}
