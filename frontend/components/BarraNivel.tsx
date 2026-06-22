"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

interface Progreso {
  nivel: number;
  xp_total: number;
  xp_en_nivel: number;
  xp_para_siguiente: number;
  titulo: string;
  xp_ordenes: number;
  xp_insignias: number;
  n_ordenes: number;
  n_insignias: number;
  insignias_por_rareza: {
    bronce: number;
    plata: number;
    oro: number;
    diamante: number;
  };
}

type Rareza = "bronce" | "plata" | "oro" | "diamante";

const RAREZA_COLOR: Record<Rareza, string> = {
  bronce: "#b08d57",
  plata: "#9ca3af",
  oro: "#f59e0b",
  diamante: "#60a5fa",
};

const RAREZAS: Rareza[] = ["bronce", "plata", "oro", "diamante"];

const VISTO_KEY = "tradex_nivel_visto";

export default function BarraNivel({ grupoId }: { grupoId?: string | null }) {
  const { t } = useLanguage();
  const [progreso, setProgreso] = useState<Progreso | null>(null);
  const [celebracion, setCelebracion] = useState<Progreso | null>(null);
  const [celebVisible, setCelebVisible] = useState(false);
  const nivelVistoRef = useRef<number | null>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion) return;

    // Carga el último nivel visto desde localStorage
    if (nivelVistoRef.current === null) {
      try {
        const raw = localStorage.getItem(VISTO_KEY);
        if (raw !== null) nivelVistoRef.current = Number(raw);
      } catch {}
    }

    let cancelado = false;

    async function cargar() {
      try {
        const url = grupoId
          ? `/insignias/progreso?grupo_id=${grupoId}`
          : "/insignias/progreso";
        const data = await api.get<Progreso>(url);
        if (cancelado) return;
        setProgreso(data);

        const visto = nivelVistoRef.current;
        if (visto !== null && data.nivel > visto) {
          setCelebracion(data);
          setCelebVisible(true);
          setTimeout(() => setCelebVisible(false), 4000);
          setTimeout(() => setCelebracion(null), 4400);
        }
        nivelVistoRef.current = data.nivel;
        try {
          localStorage.setItem(VISTO_KEY, String(data.nivel));
        } catch {}
      } catch {
        // silencioso — barra opcional
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [grupoId]);

  if (!progreso) return null;

  const total = progreso.xp_para_siguiente > 0 ? progreso.xp_para_siguiente : 1;
  const pct = Math.min(100, Math.max(0, (progreso.xp_en_nivel / total) * 100));

  return (
    <>
      <div className="border border-fg/15 bg-panel p-4">
        <div className="flex items-center gap-4">
          {/* Insignia de nivel */}
          <div className="flex shrink-0 flex-col items-center justify-center">
            <div
              className="flex size-14 items-center justify-center bg-accent text-canvas"
              style={{ borderRadius: 4 }}
            >
              <span className="font-mono text-2xl font-bold tabular-nums leading-none">
                {progreso.nivel}
              </span>
            </div>
          </div>

          {/* Título + barra */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate font-mono text-xs font-bold uppercase tracking-widest text-fg">
                {t("level.label")} {progreso.nivel} · {progreso.titulo}
              </p>
              <p className="shrink-0 font-mono text-[10px] tabular-nums text-fg/40">
                {progreso.xp_en_nivel} / {progreso.xp_para_siguiente} {t("level.xp")}
              </p>
            </div>

            <div className="mt-2 h-2 w-full overflow-hidden bg-fg/10" style={{ borderRadius: 2 }}>
              <div
                className="h-full bg-accent transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, borderRadius: 2 }}
              />
            </div>

            <p className="mt-1.5 font-mono text-[10px] text-fg/30">
              {progreso.xp_total} {t("level.xp")} · {progreso.xp_para_siguiente - progreso.xp_en_nivel} {t("level.xp")} {t("level.toNext")}
            </p>
          </div>
        </div>

        {/* Resumen de rareza */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-fg/10 pt-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-fg/40">
            {t("level.badges")}
          </span>
          {RAREZAS.map((r) => (
            <span key={r} className="flex items-center gap-1.5">
              <span
                className="inline-block size-2.5"
                style={{ backgroundColor: RAREZA_COLOR[r], borderRadius: 1 }}
              />
              <span className="font-mono text-[10px] tabular-nums text-fg/60">
                {t(`level.rarity.${r}` as any)} {progreso.insignias_por_rareza[r]}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Celebración de subida de nivel */}
      {celebracion && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
          <div
            className={`border-2 border-accent bg-panel px-6 py-4 shadow-xl transition-all duration-400 ease-out ${
              celebVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
            style={{ borderRadius: 6 }}
          >
            <p className="text-center font-mono text-[10px] uppercase tracking-widest text-accent">
              {t("level.levelUp")}
            </p>
            <p className="mt-1 text-center font-mono text-lg font-bold text-fg">
              {t("level.label")} {celebracion.nivel} · {celebracion.titulo}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
