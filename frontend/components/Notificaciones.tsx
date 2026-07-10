"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";

interface Notif {
  id: string;
  tipo: "orden_ejecutada" | "alerta_precio";
  mensaje: string;
  ticker: string;
  ts: string | null;
}

export default function Notificaciones() {
  const [toasts, setToasts] = useState<(Notif & { visible: boolean })[]>([]);
  const vistasRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== "alumno") return;

    // Load previously seen IDs from localStorage
    try {
      const raw = localStorage.getItem("tradex_notifs_vistas");
      if (raw) {
        JSON.parse(raw).forEach((id: string) => vistasRef.current.add(id));
      }
    } catch {}

    async function poll() {
      try {
        const data = await api.get<Notif[]>("/ordenes-limite/notificaciones");
        const nuevas = data.filter((n) => !vistasRef.current.has(n.id));
        if (nuevas.length === 0) return;

        nuevas.forEach((n) => vistasRef.current.add(n.id));
        try {
          localStorage.setItem("tradex_notifs_vistas", JSON.stringify([...vistasRef.current].slice(-100)));
        } catch {}

        setToasts((prev) => [
          ...nuevas.map((n) => ({ ...n, visible: true })),
          ...prev,
        ].slice(0, 5));

        // Auto-dismiss after 6s
        nuevas.forEach((n) => {
          setTimeout(() => {
            setToasts((prev) => prev.map((t) => t.id === n.id ? { ...t, visible: false } : t));
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== n.id));
            }, 400);
          }, 6000);
        });
      } catch {}
    }

    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`border-l-4 bg-panel p-3 shadow-lg transition-all duration-400 ${
            t.visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
          } ${t.tipo === "orden_ejecutada" ? "border-ganancia" : "border-accent"}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-fg/40">
                {t.tipo === "orden_ejecutada" ? "Orden ejecutada" : "Alerta de precio"}
              </p>
              <p className="mt-0.5 font-mono text-xs text-fg">{t.mensaje}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="shrink-0 text-fg/30 hover:text-fg"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
