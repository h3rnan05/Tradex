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

export function rangoDeNivel(nivel: number): { color: string; glow: string; nombre: string } {
  if (nivel >= 16) return { color: "#60a5fa", glow: "rgba(96,165,250,0.7)",  nombre: "Diamante" };
  if (nivel >= 12) return { color: "#f59e0b", glow: "rgba(245,158,11,0.7)",  nombre: "Oro" };
  if (nivel >= 8)  return { color: "#e2e8f0", glow: "rgba(226,232,240,0.6)", nombre: "Plata" };
  if (nivel >= 3)  return { color: "#cd7f32", glow: "rgba(205,127,50,0.6)",  nombre: "Bronce" };
  return            { color: "#9ca3af", glow: "rgba(156,163,175,0.5)",       nombre: "Novato" };
}

export function RangoEmblem({ nivel, size = 40 }: { nivel: number; size?: number }) {
  const rango = rangoDeNivel(nivel);
  const uid = `em${nivel}x`;
  let gradDef: React.ReactNode;
  let art: React.ReactNode;

  if (rango.nombre === "Diamante") {
    gradDef = (
      <radialGradient id={uid} cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#93c5fd" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </radialGradient>
    );
    art = (
      <>
        <polygon points="30,3 52,15 52,45 30,57 8,45 8,15" fill="none" stroke="#60a5fa" strokeWidth="2.5"/>
        <polygon points="30,10 46,19 46,41 30,50 14,41 14,19" fill={"url(#" + uid + ")"}/>
        <polygon points="30,10 46,19 30,30" fill="#93c5fd" fillOpacity="0.35"/>
        <polygon points="14,19 30,10 30,30" fill="#60a5fa" fillOpacity="0.2"/>
        <polygon points="46,19 46,41 30,30" fill="#3b82f6" fillOpacity="0.3"/>
        <polygon points="14,41 14,19 30,30" fill="#60a5fa" fillOpacity="0.15"/>
        <polygon points="30,50 14,41 30,30" fill="#93c5fd" fillOpacity="0.25"/>
        <polygon points="46,41 30,50 30,30" fill="#3b82f6" fillOpacity="0.2"/>
        <circle cx="30" cy="30" r="5" fill="#dbeafe" fillOpacity="0.7"/>
        <circle cx="30" cy="30" r="2" fill="#fff" fillOpacity="0.9"/>
        <line x1="30" y1="3"  x2="30" y2="10" stroke="#60a5fa" strokeWidth="1.5"/>
        <line x1="30" y1="50" x2="30" y2="57" stroke="#60a5fa" strokeWidth="1.5"/>
        <line x1="8"  y1="15" x2="14" y2="19" stroke="#60a5fa" strokeWidth="1.5"/>
        <line x1="52" y1="15" x2="46" y2="19" stroke="#60a5fa" strokeWidth="1.5"/>
        <line x1="8"  y1="45" x2="14" y2="41" stroke="#60a5fa" strokeWidth="1.5"/>
        <line x1="52" y1="45" x2="46" y2="41" stroke="#60a5fa" strokeWidth="1.5"/>
        <circle cx="30" cy="3"  r="2" fill="#93c5fd"/>
        <circle cx="52" cy="15" r="2" fill="#93c5fd"/>
        <circle cx="52" cy="45" r="2" fill="#93c5fd"/>
        <circle cx="30" cy="57" r="2" fill="#93c5fd"/>
        <circle cx="8"  cy="45" r="2" fill="#93c5fd"/>
        <circle cx="8"  cy="15" r="2" fill="#93c5fd"/>
      </>
    );
  } else if (rango.nombre === "Oro") {
    gradDef = (
      <radialGradient id={uid} cx="50%" cy="25%" r="70%">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="100%" stopColor="#78350f" />
      </radialGradient>
    );
    art = (
      <>
        <path d="M30 4 L52 14 L52 36 C52 47 42 54 30 58 C18 54 8 47 8 36 L8 14 Z"
              fill={"url(#" + uid + ")"} stroke="#f59e0b" strokeWidth="2.5"/>
        <path d="M30 10 L46 18 L46 34 C46 43 38 49 30 52 C22 49 14 43 14 34 L14 18 Z"
              fill="none" stroke="#fde68a" strokeWidth="1" strokeOpacity="0.4"/>
        <path d="M18 29 L18 21 L22 25 L26 17 L30 23 L34 17 L38 25 L42 21 L42 29 Z"
              fill="#fde68a" stroke="#f59e0b" strokeWidth="1"/>
        <rect x="17" y="29" width="26" height="6" rx="1" fill="#f59e0b" stroke="#fde68a" strokeWidth="0.5"/>
        <circle cx="24" cy="22" r="1.5" fill="#fff" fillOpacity="0.8"/>
        <circle cx="30" cy="20" r="1.5" fill="#fff" fillOpacity="0.8"/>
        <circle cx="36" cy="22" r="1.5" fill="#fff" fillOpacity="0.8"/>
        <polyline points="18,48 22,44 26,46 30,40 34,42 38,36 42,38" stroke="#fde68a" strokeWidth="1.5" fill="none"/>
        <polygon points="42,33 45,39 39,39" fill="#fde68a"/>
        <circle cx="8"  cy="14" r="3" fill="#f59e0b" stroke="#fde68a" strokeWidth="1"/>
        <circle cx="52" cy="14" r="3" fill="#f59e0b" stroke="#fde68a" strokeWidth="1"/>
      </>
    );
  } else if (rango.nombre === "Plata") {
    gradDef = (
      <radialGradient id={uid} cx="50%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#f1f5f9" />
        <stop offset="100%" stopColor="#475569" />
      </radialGradient>
    );
    art = (
      <>
        <path d="M20 30 C16 26 10 24 7 20 C9 17 13 19 15 21 C13 17 15 12 19 14 C17 11 20 7 23 11 C23 17 21 24 20 30Z"
              fill={"url(#" + uid + ")"} stroke="#e2e8f0" strokeWidth="1"/>
        <path d="M40 30 C44 26 50 24 53 20 C51 17 47 19 45 21 C47 17 45 12 41 14 C43 11 40 7 37 11 C37 17 39 24 40 30Z"
              fill={"url(#" + uid + ")"} stroke="#e2e8f0" strokeWidth="1"/>
        <line x1="10" y1="21" x2="20" y2="27" stroke="#e2e8f0" strokeWidth="0.7" strokeOpacity="0.5"/>
        <line x1="12" y1="16" x2="20" y2="23" stroke="#e2e8f0" strokeWidth="0.7" strokeOpacity="0.5"/>
        <line x1="50" y1="21" x2="40" y2="27" stroke="#e2e8f0" strokeWidth="0.7" strokeOpacity="0.5"/>
        <line x1="48" y1="16" x2="40" y2="23" stroke="#e2e8f0" strokeWidth="0.7" strokeOpacity="0.5"/>
        <path d="M30 8 L43 15 L43 32 C43 41 37 47 30 49 C23 47 17 41 17 32 L17 15 Z"
              fill="#0f172a" stroke="#e2e8f0" strokeWidth="1.5"/>
        <rect x="21" y="27" width="4" height="9"  fill="#94a3b8"/>
        <line x1="23" y1="23" x2="23" y2="27"    stroke="#94a3b8" strokeWidth="1.2"/>
        <line x1="23" y1="36" x2="23" y2="40"    stroke="#94a3b8" strokeWidth="1.2"/>
        <rect x="28" y="21" width="4" height="7"  fill="#e2e8f0"/>
        <line x1="30" y1="19" x2="30" y2="21"    stroke="#e2e8f0" strokeWidth="1.2"/>
        <line x1="30" y1="28" x2="30" y2="32"    stroke="#e2e8f0" strokeWidth="1.2"/>
        <rect x="35" y="25" width="4" height="10" fill="#94a3b8"/>
        <line x1="37" y1="21" x2="37" y2="25"    stroke="#94a3b8" strokeWidth="1.2"/>
        <line x1="37" y1="35" x2="37" y2="39"    stroke="#94a3b8" strokeWidth="1.2"/>
      </>
    );
  } else if (rango.nombre === "Bronce") {
    gradDef = (
      <radialGradient id={uid} cx="50%" cy="25%" r="70%">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#7c2d12" />
      </radialGradient>
    );
    art = (
      <>
        <polygon points="30,4 44,8 54,22 54,38 44,52 30,56 16,52 6,38 6,22 16,8"
                 fill={"url(#" + uid + ")"} stroke="#cd7f32" strokeWidth="2.5"/>
        <polygon points="30,10 42,14 50,24 50,36 42,46 30,50 18,46 10,36 10,24 18,14"
                 fill="none" stroke="#d97706" strokeWidth="1" strokeOpacity="0.4"/>
        <ellipse cx="30" cy="28" rx="11" ry="10" fill="#92400e"/>
        <path d="M19 23 C15 16 10 16 10 21 C10 25 17 25 19 23Z" fill="#78350f" stroke="#cd7f32" strokeWidth="1"/>
        <path d="M41 23 C45 16 50 16 50 21 C50 25 43 25 41 23Z" fill="#78350f" stroke="#cd7f32" strokeWidth="1"/>
        <ellipse cx="25" cy="26" rx="3.5" ry="3" fill="#fef3c7"/>
        <ellipse cx="35" cy="26" rx="3.5" ry="3" fill="#fef3c7"/>
        <circle cx="25" cy="26" r="1.5" fill="#111"/>
        <circle cx="35" cy="26" r="1.5" fill="#111"/>
        <circle cx="24" cy="25" r="0.8" fill="#fff" fillOpacity="0.6"/>
        <circle cx="34" cy="25" r="0.8" fill="#fff" fillOpacity="0.6"/>
        <ellipse cx="30" cy="33" rx="6" ry="4" fill="#78350f"/>
        <ellipse cx="27" cy="33" rx="1.5" ry="1.2" fill="#92400e"/>
        <ellipse cx="33" cy="33" rx="1.5" ry="1.2" fill="#92400e"/>
        <polyline points="14,48 18,44 22,46 26,40 30,42 34,36 38,38 44,32"
                  stroke="#fbbf24" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <circle cx="16" cy="8"  r="2" fill="#fbbf24"/>
        <circle cx="44" cy="8"  r="2" fill="#fbbf24"/>
        <circle cx="54" cy="22" r="2" fill="#fbbf24"/>
        <circle cx="54" cy="38" r="2" fill="#fbbf24"/>
        <circle cx="44" cy="52" r="2" fill="#fbbf24"/>
        <circle cx="16" cy="52" r="2" fill="#fbbf24"/>
        <circle cx="6"  cy="38" r="2" fill="#fbbf24"/>
        <circle cx="6"  cy="22" r="2" fill="#fbbf24"/>
      </>
    );
  } else {
    gradDef = (
      <radialGradient id={uid} cx="50%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#9ca3af" />
        <stop offset="100%" stopColor="#374151" />
      </radialGradient>
    );
    art = (
      <>
        <circle cx="30" cy="30" r="26" fill={"url(#" + uid + ")"} stroke="#6b7280" strokeWidth="2"/>
        <circle cx="30" cy="30" r="20" fill="none" stroke="#9ca3af" strokeWidth="1"/>
        <line x1="30" y1="5"  x2="30" y2="10" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
        <line x1="30" y1="50" x2="30" y2="55" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
        <line x1="5"  y1="30" x2="10" y2="30" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
        <line x1="50" y1="30" x2="55" y2="30" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
        <line x1="12" y1="12" x2="15" y2="15" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="48" y1="12" x2="45" y2="15" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="12" y1="48" x2="15" y2="45" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="48" y1="48" x2="45" y2="45" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
        <text x="30" y="37" textAnchor="middle" fontSize="22" fill="#1f2937" fontWeight="bold" fontFamily="monospace">$</text>
      </>
    );
  }

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 60 60" style={{ width: "100%", height: "100%", filter: `drop-shadow(0 0 ${Math.round(size / 7)}px ${rango.glow})`, overflow: "visible" }}>
        <defs>{gradDef}</defs>
        {art}
      </svg>
      <div
        className="absolute -bottom-1 -right-1 flex items-center justify-center font-mono font-black tabular-nums text-black leading-none"
        style={{ background: rango.color, fontSize: Math.max(8, Math.round(size / 4.5)), minWidth: Math.round(size / 2.5), height: Math.round(size / 2.5), borderRadius: 2, padding: "0 3px", boxShadow: `0 0 6px ${rango.glow}` }}
      >
        {nivel}
      </div>
    </div>
  );
}

const VISTO_KEY = "tradex_nivel_visto";

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
        const url = grupoId ? `/insignias/progreso?grupo_id=${grupoId}` : "/insignias/progreso";
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
      <div className="flex items-center gap-2.5">
        <RangoEmblem nivel={progreso.nivel} size={38} />
        <div className="flex min-w-[90px] flex-col gap-0.5">
          <div className="font-mono text-[9px] font-bold uppercase tracking-widest leading-none" style={{ color: rango.color }}>
            {rango.nombre}
          </div>
          <div className="h-1.5 w-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: rango.color, boxShadow: `0 0 4px ${rango.glow}` }} />
          </div>
          <div className="font-mono text-[8px] tabular-nums leading-none text-fg/40">
            {progreso.xp_en_nivel}/{progreso.xp_para_siguiente} {t("level.xp")}
          </div>
        </div>
      </div>
      {celebracion && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4">
          <div className={`border-2 bg-canvas px-8 py-5 shadow-2xl transition-all duration-500 ease-out ${celebVisible ? "scale-100 opacity-100" : "scale-90 opacity-0"}`} style={{ borderColor: rango.color, borderRadius: 4 }}>
            <div className="flex flex-col items-center gap-3">
              <RangoEmblem nivel={celebracion.nivel} size={64} />
              <div>
                <p className="text-center font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: rango.color }}>{t("level.levelUp")}</p>
                <p className="mt-1 text-center font-mono text-2xl font-black tabular-nums text-fg">{t("level.label")} {celebracion.nivel}</p>
                <p className="mt-0.5 text-center font-mono text-sm font-semibold text-fg/60">{celebracion.titulo}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

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
    { key: "bronce",   label: t("level.rarity.bronce"),   color: "#cd7f32" },
    { key: "plata",    label: t("level.rarity.plata"),    color: "#9ca3af" },
    { key: "oro",      label: t("level.rarity.oro"),      color: "#f59e0b" },
    { key: "diamante", label: t("level.rarity.diamante"), color: "#60a5fa" },
  ];

  return (
    <div className="border border-fg/15 bg-panel p-4">
      <div className="flex items-center gap-5">
        <RangoEmblem nivel={progreso.nivel} size={72} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <span className="font-mono text-sm font-bold uppercase tracking-wider text-fg">{progreso.titulo}</span>
            <span className="font-mono text-[10px] tabular-nums text-fg/40">{progreso.xp_en_nivel} / {progreso.xp_para_siguiente} {t("level.xp")}</span>
          </div>
          <div className="relative h-3 w-full overflow-hidden bg-fg/10" style={{ borderRadius: 2 }}>
            <div className="h-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: rango.color, boxShadow: `0 0 6px ${rango.glow}`, borderRadius: 2 }} />
            {[25, 50, 75].map((m) => (
              <div key={m} className="absolute top-0 h-full w-px bg-canvas/30" style={{ left: `${m}%` }} />
            ))}
          </div>
          <div className="mt-1.5">
            <span className="font-mono text-[9px] text-fg/30">{progreso.xp_total} XP total · faltan {progreso.xp_para_siguiente - progreso.xp_en_nivel} {t("level.xp")} {t("level.toNext")}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-fg/10 pt-4">
        {RAREZAS.map(({ key, label, color }) => (
          <div key={key} className="flex flex-col items-center gap-1">
            <div className="flex size-8 items-center justify-center font-mono text-sm font-black tabular-nums text-black" style={{ backgroundColor: color, borderRadius: 2, boxShadow: `0 0 6px ${color}55` }}>
              {progreso.insignias_por_rareza[key]}
            </div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-fg/40">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
