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

// Rangos visuales: el color de la barra cambia según el nivel,
// igual que en GTA Online pero con paleta financiera pro.
function rangoDeNivel(nivel: number): { color: string; glow: string; nombre: string } {
  if (nivel >= 16) return { color: "#60a5fa", glow: "rgba(96,165,250,0.6)",  nombre: "Diamante" };
  if (nivel >= 12) return { color: "#f59e0b", glow: "rgba(245,158,11,0.5)",  nombre: "Oro" };
  if (nivel >= 8)  return { color: "#e2e8f0", glow: "rgba(226,232,240,0.45)", nombre: "Plata" };
  if (nivel >= 3)  return { color: "#cd7f32", glow: "rgba(205,127,50,0.45)",  nombre: "Bronce" };
  return            { color: "#6b7280", glow: "rgba(107,114,128,0.3)",        nombre: "Novato" };
}

const VISTO_KEY = "tradex_nivel_visto";

// Barra HUD estilo GTA: pegada al borde izquierdo de la pantalla.
// Se usa en el Navbar para que siempre sea visible.
export function BarraNivelHUD({ grupoId }: { grupoId?: string | null }) {
  const { t } = useLanguage();
  const [progreso, setProgreso] = useState<Progreso | null>(null);
  const [celebracion, setCelebracion] = useState<Progreso | null>(null);
  const [celebVisible, setCelebVisible] = useState(false);
  const nivelVistoRef = useRef<number | null>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion || sesion.rol !== "alumno") return;

    try {
      const raw = localStorage.getItem(VISTO_KEY);
      if (raw !== null) nivelVistoRef.current = Number(raw);
    } catch {}

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
          setTimeout(() => setCelebracion(null), 4600);
        }
        nivelVistoRef.current = data.nivel;
        try { localStorage.setItem(VISTO_KEY, String(data.nivel)); } catch {}
      } catch {}
    }

    cargar();
    return () => { cancelado = true; };
  }, [grupoId]);

  if (!progreso) return null;

  const rango = rangoDeNivel(progreso.nivel);
  const pct = Math.min(100, Math.max(0, (progreso.xp_en_nivel / (progreso.xp_para_siguiente || 1)) * 100));

  return (
    <>
      {/* HUD: nivel + barra XP horizontal, compacto */}
      <div className="flex items-center gap-2">
        {/* Número de nivel con color del rango */}
        <div
          className="flex size-7 shrink-0 items-center justify-center font-mono text-[13px] font-black tabular-nums leading-none text-black"
          style={{
            backgroundColor: rango.color,
            boxShadow: `0 0 8px ${rango.glow}`,
            borderRadius: 3,
          }}
        >
          {progreso.nivel}
        </div>

        {/* Barra XP + texto */}
        <div className="flex min-w-[90px] flex-col gap-0.5">
          <div
            className="font-mono text-[9px] font-bold uppercase tracking-widest leading-none"
            style={{ color: rango.color }}
          >
            {rango.nombre}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-none" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full transition-all duration-700 ease-out"
              style={{
                width: `${pct}%`,
                backgroundColor: rango.color,
                boxShadow: `0 0 4px ${rango.glow}`,
              }}
            />
          </div>
          <div className="font-mono text-[8px] tabular-nums leading-none text-fg/40">
            {progreso.xp_en_nivel}/{progreso.xp_para_siguiente} {t("level.xp")}
          </div>
        </div>
      </div>

      {/* Celebración de subida de nivel */}
      {celebracion && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4">
          <div
            className={`border-2 bg-canvas px-8 py-5 shadow-2xl transition-all duration-500 ease-out ${
              celebVisible ? "scale-100 opacity-100" : "scale-90 opacity-0"
            }`}
            style={{ borderColor: rango.color, borderRadius: 4 }}
          >
            <p
              className="text-center font-mono text-[11px] uppercase tracking-[0.3em]"
              style={{ color: rango.color }}
            >
              {t("level.levelUp")}
            </p>
            <p className="mt-1 text-center font-mono text-2xl font-black tabular-nums text-fg">
              {t("level.label")} {celebracion.nivel}
            </p>
            <p className="mt-0.5 text-center font-mono text-sm font-semibold text-fg/60">
              {celebracion.titulo}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// Panel expandido para la sección de logros del portafolio.
export default function BarraNivel({ grupoId }: { grupoId?: string | null }) {
  const { t } = useLanguage();
  const [progreso, setProgreso] = useState<Progreso | null>(null);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion) return;
    let cancelado = false;
    async function cargar() {
      try {
        const url = grupoId ? `/insignias/progreso?grupo_id=${grupoId}` : "/insignias/progreso";
        const data = await api.get<Progreso>(url);
        if (!cancelado) setProgreso(data);
      } catch {}
    }
    cargar();
    return () => { cancelado = true; };
  }, [grupoId]);

  if (!progreso) return null;

  const rango = rangoDeNivel(progreso.nivel);
  const pct = Math.min(100, Math.max(0, (progreso.xp_en_nivel / (progreso.xp_para_siguiente || 1)) * 100));

  const RAREZAS: Array<{ key: keyof typeof progreso.insignias_por_rareza; label: string; color: string }> = [
    { key: "bronce",  label: t("level.rarity.bronce"),  color: "#cd7f32" },
    { key: "plata",   label: t("level.rarity.plata"),   color: "#9ca3af" },
    { key: "oro",     label: t("level.rarity.oro"),     color: "#f59e0b" },
    { key: "diamante",label: t("level.rarity.diamante"),color: "#60a5fa" },
  ];

  return (
    <div className="border border-fg/15 bg-panel p-4">
      <div className="flex items-center gap-5">
        {/* Cuadro de nivel grande */}
        <div
          className="flex size-16 shrink-0 flex-col items-center justify-center text-black"
          style={{
            backgroundColor: rango.color,
            boxShadow: `0 0 18px ${rango.glow}`,
            borderRadius: 4,
          }}
        >
          <span className="font-mono text-2xl font-black tabular-nums leading-none">{progreso.nivel}</span>
          <span className="font-mono text-[8px] font-bold uppercase tracking-widest mt-0.5 opacity-70">{rango.nombre}</span>
        </div>

        {/* Barra + stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <span className="font-mono text-sm font-bold uppercase tracking-wider text-fg">
              {progreso.titulo}
            </span>
            <span className="font-mono text-[10px] tabular-nums text-fg/40">
              {progreso.xp_en_nivel} / {progreso.xp_para_siguiente} {t("level.xp")}
            </span>
          </div>

          {/* Barra XP estilo GTA */}
          <div className="relative h-3 w-full overflow-hidden bg-fg/10" style={{ borderRadius: 2 }}>
            <div
              className="h-full transition-all duration-700 ease-out"
              style={{
                width: `${pct}%`,
                backgroundColor: rango.color,
                boxShadow: `0 0 6px ${rango.glow}`,
                borderRadius: 2,
              }}
            />
            {/* Marcas de 25/50/75% */}
            {[25, 50, 75].map((m) => (
              <div
                key={m}
                className="absolute top-0 h-full w-px bg-canvas/30"
                style={{ left: `${m}%` }}
              />
            ))}
          </div>

          <div className="mt-1.5 flex items-center justify-between">
            <span className="font-mono text-[9px] text-fg/30">
              {progreso.xp_total} XP total · faltan {progreso.xp_para_siguiente - progreso.xp_en_nivel} {t("level.xp")} {t("level.toNext")}
            </span>
          </div>
        </div>
      </div>

      {/* Insignias por rareza */}
      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-fg/10 pt-4">
        {RAREZAS.map(({ key, label, color }) => (
          <div key={key} className="flex flex-col items-center gap-1">
            <div
              className="flex size-8 items-center justify-center font-mono text-sm font-black tabular-nums text-black"
              style={{ backgroundColor: color, borderRadius: 2, boxShadow: `0 0 6px ${color}55` }}
            >
              {progreso.insignias_por_rareza[key]}
            </div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-fg/40">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
