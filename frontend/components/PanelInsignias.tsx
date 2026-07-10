"use client";

import { useLanguage } from "@/lib/i18n";

interface Insignia {
  codigo: string;
  otorgada_at: string;
}

export type Nivel = "facil" | "medio" | "dificil" | "legendario";

export interface BadgeDef {
  codigo: string;
  titulo: string;
  desc: string;
  nivel: Nivel;
}

export const NIVEL_COLORES: Record<Nivel, { accent: string; glow: string; dim: string; label: string }> = {
  facil:      { accent: "#9ca3af", glow: "rgba(156,163,175,0.6)",  dim: "#374151", label: "Fácil" },
  medio:      { accent: "#3b82f6", glow: "rgba(59,130,246,0.7)",   dim: "#1e3a5f", label: "Medio" },
  dificil:    { accent: "#f59e0b", glow: "rgba(245,158,11,0.7)",   dim: "#2d1f00", label: "Difícil" },
  legendario: { accent: "#a855f7", glow: "rgba(168,85,247,0.8)",   dim: "#2e1065", label: "Legendario" },
};

export const BADGES_DEF: BadgeDef[] = [
  { codigo: "primera_orden",            titulo: "Primera Orden",         desc: "Ejecuta tu primera operación",                   nivel: "facil" },
  { codigo: "sin_miedo_a_vender",       titulo: "Sin Miedo a Vender",    desc: "Ejecuta tu primera venta",                       nivel: "facil" },
  { codigo: "primera_ganancia",         titulo: "Primera Ganancia",      desc: "Ten una posición en verde",                      nivel: "facil" },
  { codigo: "short_seller",             titulo: "Short Seller",          desc: "Abre tu primera posición en corto",              nivel: "facil" },
  { codigo: "alerta_puesta",            titulo: "Vigilante",             desc: "Configura tu primera alerta de precio",          nivel: "facil" },
  { codigo: "operador_activo",          titulo: "Operador Activo",       desc: "Realiza 10 o más operaciones",                   nivel: "medio" },
  { codigo: "portafolio_diversificado", titulo: "Diversificado",         desc: "Ten 5 o más activos distintos",                  nivel: "medio" },
  { codigo: "explorador_mercados",      titulo: "Explorador",            desc: "Opera en 3 categorías de activos distintas",     nivel: "medio" },
  { codigo: "cazador_de_cripto",        titulo: "Hodler",                desc: "Ten Bitcoin o Ethereum en cartera",              nivel: "medio" },
  { codigo: "orden_limite_ejecutada",   titulo: "Precisión Quirúrgica",  desc: "Ejecuta una orden límite automáticamente",       nivel: "medio" },
  { codigo: "operador_veterano",        titulo: "Veterano",              desc: "Realiza 50 o más operaciones",                   nivel: "dificil" },
  { codigo: "gran_cartera",             titulo: "Gran Cartera",          desc: "Ten 10 o más activos simultáneamente",           nivel: "dificil" },
  { codigo: "rentabilidad_10",          titulo: "Rentable",              desc: "Logra un rendimiento mayor al 10%",              nivel: "dificil" },
  { codigo: "diversificado_global",     titulo: "Diversificado Global",  desc: "Opera en 5 o más categorías de activos",        nivel: "dificil" },
  { codigo: "riesgo_calculado",         titulo: "Riesgo Calculado",      desc: "Ten posiciones largas Y cortas al mismo tiempo", nivel: "dificil" },
  { codigo: "centenar",                 titulo: "El Centenar",           desc: "Realiza 100 o más operaciones",                  nivel: "legendario" },
  { codigo: "rentabilidad_50",          titulo: "Genio Financiero",      desc: "Logra un rendimiento mayor al 50%",              nivel: "legendario" },
  { codigo: "maestro_del_mercado",      titulo: "Maestro del Mercado",   desc: "Opera en las 6 categorías disponibles",         nivel: "legendario" },
  { codigo: "ballena",                  titulo: "Ballena",               desc: "Duplica tu capital inicial",                    nivel: "legendario" },
  { codigo: "sin_rendirse",             titulo: "Constancia",            desc: "Opera en 5 días distintos",                     nivel: "legendario" },
  { codigo: "campeon_reto",             titulo: "Campeón de Retos",      desc: "Gana un reto del grupo",                        nivel: "legendario" },
];

export const NIVEL_ORDEN: Nivel[] = ["facil", "medio", "dificil", "legendario"];

// BO3-style SVG artwork — monochromatic silhouettes, financial-themed
const BADGE_ART: Record<string, React.ReactNode> = {
  primera_orden: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="24" r="16" strokeWidth="1.5"/>
      <circle cx="24" cy="24" r="8"  strokeWidth="1.5"/>
      <line x1="24" y1="4"  x2="24" y2="13" strokeWidth="2"/>
      <line x1="24" y1="35" x2="24" y2="44" strokeWidth="2"/>
      <line x1="4"  y1="24" x2="13" y2="24" strokeWidth="2"/>
      <line x1="35" y1="24" x2="44" y2="24" strokeWidth="2"/>
      <circle cx="24" cy="24" r="3" fill="currentColor" stroke="none"/>
    </svg>
  ),
  sin_miedo_a_vender: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6,14 18,26 26,18 42,34" strokeWidth="2.5"/>
      <polyline points="34,34 42,34 42,26" strokeWidth="2.5"/>
      <line x1="8" y1="40" x2="40" y2="40" strokeWidth="1.5"/>
      <polyline points="10,38 10,30 16,30" strokeWidth="1.5"/>
    </svg>
  ),
  primera_ganancia: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6,36 16,22 24,28 32,14 42,8" strokeWidth="2.5"/>
      <line x1="42" y1="8" x2="42" y2="18" strokeWidth="2"/>
      <line x1="32" y1="8" x2="42" y2="8" strokeWidth="2"/>
      <line x1="6" y1="42" x2="42" y2="42" strokeWidth="1.5"/>
      <line x1="6" y1="6"  x2="6"  y2="42" strokeWidth="1.5"/>
    </svg>
  ),
  short_seller: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <line x1="24" y1="6" x2="24" y2="34" strokeWidth="2.5"/>
      <polyline points="14,24 24,34 34,24" strokeWidth="2.5"/>
      <line x1="10" y1="12" x2="38" y2="12" strokeWidth="1.5" strokeDasharray="3 3"/>
      <line x1="10" y1="42" x2="38" y2="42" strokeWidth="1.5"/>
      <rect x="10" y="38" width="6" height="4" fill="currentColor" stroke="none"/>
      <rect x="21" y="38" width="6" height="4" fill="currentColor" stroke="none"/>
      <rect x="32" y="38" width="6" height="4" fill="currentColor" stroke="none"/>
    </svg>
  ),
  alerta_puesta: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 6 C24 6 10 16 10 28 L10 34 L38 34 L38 28 C38 16 24 6 24 6Z" strokeWidth="1.5"/>
      <line x1="20" y1="40" x2="28" y2="40" strokeWidth="2.5"/>
      <circle cx="24" cy="34" r="2" fill="currentColor" stroke="none"/>
      <path d="M8 18 C4 20 2 24 2 28" strokeWidth="1.5" strokeOpacity="0.5"/>
      <path d="M40 18 C44 20 46 24 46 28" strokeWidth="1.5" strokeOpacity="0.5"/>
    </svg>
  ),
  operador_activo: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 4 L28 18 L42 18 L31 27 L35 41 L24 32 L13 41 L17 27 L6 18 L20 18 Z" strokeWidth="2"/>
      <text x="24" y="28" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none" fontWeight="bold">10</text>
    </svg>
  ),
  portafolio_diversificado: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6"  y="6"  width="16" height="16" strokeWidth="1.5"/>
      <rect x="26" y="6"  width="16" height="16" strokeWidth="1.5"/>
      <rect x="6"  y="26" width="16" height="16" strokeWidth="1.5"/>
      <rect x="26" y="26" width="16" height="16" strokeWidth="1.5"/>
      <line x1="14" y1="14" x2="34" y2="34" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.4"/>
      <line x1="34" y1="14" x2="14" y2="34" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.4"/>
    </svg>
  ),
  explorador_mercados: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="24" r="18" strokeWidth="1.5"/>
      <ellipse cx="24" cy="24" rx="8" ry="18" strokeWidth="1.5"/>
      <line x1="6"  y1="24" x2="42" y2="24" strokeWidth="1.5"/>
      <line x1="10" y1="14" x2="38" y2="14" strokeWidth="1" strokeOpacity="0.5"/>
      <line x1="10" y1="34" x2="38" y2="34" strokeWidth="1" strokeOpacity="0.5"/>
      <circle cx="24" cy="24" r="3" fill="currentColor" stroke="none"/>
    </svg>
  ),
  cazador_de_cripto: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8 L16 40 M16 8 L28 8 C34 8 38 12 38 18 C38 22 36 25 32 26 C37 27 40 31 40 36 C40 42 36 40 28 40 L16 40" strokeWidth="2.5"/>
      <line x1="12" y1="20" x2="16" y2="20" strokeWidth="2"/>
      <line x1="12" y1="30" x2="16" y2="30" strokeWidth="2"/>
    </svg>
  ),
  orden_limite_ejecutada: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="28" x2="42" y2="28" strokeWidth="1.5" strokeDasharray="4 2"/>
      <polyline points="6,38 14,26 22,32 30,20 38,10" strokeWidth="2"/>
      <circle cx="38" cy="10" r="4" fill="currentColor" stroke="none"/>
      <line x1="34" y1="10" x2="6"  y2="10" strokeWidth="1" strokeOpacity="0.4"/>
    </svg>
  ),
  operador_veterano: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 6 L24 4 L32 6 L38 12 L42 20 L40 30 L32 38 L24 42 L16 38 L8 30 L6 20 L10 12 Z" strokeWidth="1.5"/>
      <path d="M18 14 L24 8 L30 14 L34 20 L32 28 L26 34 L24 36 L22 34 L16 28 L14 20 Z" strokeWidth="1" strokeOpacity="0.5"/>
      <path d="M24 18 L26 22 L30 22 L27 25 L28 29 L24 27 L20 29 L21 25 L18 22 L22 22 Z" fill="currentColor" stroke="none"/>
    </svg>
  ),
  gran_cartera: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="18" width="40" height="26" rx="2" strokeWidth="1.5"/>
      <path d="M16 18 L16 12 C16 9 18 8 20 8 L28 8 C30 8 32 9 32 12 L32 18" strokeWidth="1.5"/>
      <circle cx="24" cy="31" r="6" strokeWidth="1.5"/>
      <line x1="24" y1="27" x2="24" y2="35" strokeWidth="1.5"/>
      <line x1="20" y1="31" x2="28" y2="31" strokeWidth="1.5"/>
    </svg>
  ),
  rentabilidad_10: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 42 L18 28 L6 26 L16 16 L12 4 L24 10 L36 4 L32 16 L42 26 L30 28 Z" strokeWidth="1.5"/>
      <line x1="24" y1="10" x2="24" y2="22" strokeWidth="2"/>
      <line x1="20" y1="22" x2="28" y2="22" strokeWidth="2"/>
    </svg>
  ),
  diversificado_global: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="24" r="18" strokeWidth="1.5"/>
      <ellipse cx="24" cy="24" rx="8" ry="18" strokeWidth="1.5"/>
      <line x1="6"  y1="24" x2="42" y2="24" strokeWidth="1.5"/>
      <polyline points="24,6 30,12 24,18 18,12 24,6" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2"/>
    </svg>
  ),
  riesgo_calculado: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <line x1="24" y1="6" x2="24" y2="42" strokeWidth="1.5"/>
      <line x1="10" y1="14" x2="38" y2="14" strokeWidth="2"/>
      <path d="M10 14 L6 28 L14 28 Z" strokeWidth="1.5"/>
      <path d="M38 14 L42 28 L34 28 Z" strokeWidth="1.5"/>
      <line x1="6"  y1="28" x2="14" y2="28" strokeWidth="1.5"/>
      <line x1="34" y1="28" x2="42" y2="28" strokeWidth="1.5"/>
      <line x1="24" y1="38" x2="10" y2="42" strokeWidth="1.5"/>
      <line x1="24" y1="38" x2="38" y2="42" strokeWidth="1.5"/>
    </svg>
  ),
  centenar: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="24,4 44,14 44,34 24,44 4,34 4,14" strokeWidth="1.5"/>
      <polygon points="24,9 39,17 39,31 24,39 9,31 9,17" strokeWidth="1" strokeOpacity="0.3"/>
      <text x="24" y="30" textAnchor="middle" fontSize="14" fill="currentColor" stroke="none" fontWeight="bold">100</text>
    </svg>
  ),
  rentabilidad_50: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="24" cy="20" rx="14" ry="14" strokeWidth="1.5"/>
      <path d="M14 14 C14 10 18 8 22 10 C26 12 26 18 22 20 C18 22 18 28 22 30 C26 32 30 30 30 26" strokeWidth="2"/>
      <line x1="24" y1="6"  x2="24" y2="9"  strokeWidth="2"/>
      <line x1="24" y1="31" x2="24" y2="34" strokeWidth="2"/>
      <polyline points="18,38 24,44 30,38" strokeWidth="2"/>
      <line x1="24" y1="34" x2="24" y2="44" strokeWidth="2"/>
    </svg>
  ),
  maestro_del_mercado: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 20 L14 8 L24 12 L34 8 L40 20 L32 20 C32 24 28 26 24 26 C20 26 16 24 16 20 Z" strokeWidth="1.5"/>
      <line x1="16" y1="26" x2="14" y2="42" strokeWidth="1.5"/>
      <line x1="32" y1="26" x2="34" y2="42" strokeWidth="1.5"/>
      <line x1="10" y1="42" x2="38" y2="42" strokeWidth="2"/>
      <line x1="10" y1="36" x2="38" y2="36" strokeWidth="1" strokeOpacity="0.4"/>
    </svg>
  ),
  ballena: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 28 C4 20 10 14 20 14 C26 14 32 10 38 12 C44 14 46 20 44 26 C42 32 36 36 28 36 C22 36 18 34 14 38 C10 42 6 40 4 36 Z" strokeWidth="2"/>
      <circle cx="36" cy="22" r="2.5" fill="currentColor" stroke="none"/>
      <path d="M4 28 C2 24 4 18 8 18" strokeWidth="1.5" strokeOpacity="0.5"/>
    </svg>
  ),
  sin_rendirse: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 4 C20 10 16 14 16 20 C16 26 20 30 24 30 C28 30 32 26 32 20 C32 14 28 10 24 4Z" strokeWidth="1.5"/>
      <path d="M20 20 C20 16 22 12 24 10 C24 10 28 14 28 20" strokeWidth="1" strokeOpacity="0.4"/>
      <path d="M16 34 C12 36 10 40 10 44" strokeWidth="1.5"/>
      <path d="M32 34 C36 36 38 40 38 44" strokeWidth="1.5"/>
      <line x1="24" y1="30" x2="24" y2="42" strokeWidth="1.5"/>
      <line x1="10" y1="44" x2="38" y2="44" strokeWidth="2"/>
    </svg>
  ),
  campeon_reto: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 6 L34 6 L34 26 C34 34 28 40 24 42 C20 40 14 34 14 26 Z" strokeWidth="1.5"/>
      <path d="M6 10 L14 10 L14 24 C14 26 15 28 16 30" strokeWidth="1.5"/>
      <path d="M42 10 L34 10 L34 24 C34 26 33 28 32 30" strokeWidth="1.5"/>
      <path d="M18 20 L24 8 L30 20" strokeWidth="1.5"/>
      <line x1="20" y1="18" x2="28" y2="18" strokeWidth="1.5"/>
      <line x1="20" y1="44" x2="28" y2="44" strokeWidth="2"/>
      <line x1="16" y1="44" x2="32" y2="44" strokeWidth="2"/>
    </svg>
  ),
};

function BadgeTile({ def, tiene, fecha, t }: { def: BadgeDef; tiene: boolean; fecha?: string; t: (k: any) => string }) {
  const c = NIVEL_COLORES[def.nivel];
  const art = BADGE_ART[def.codigo];

  return (
    <div className="flex flex-col items-center gap-2 text-center group">
      <div
        className="relative overflow-hidden transition-all duration-300"
        style={{
          width: 80,
          height: 80,
          background: tiene ? `linear-gradient(145deg, #0a0a0a 0%, ${c.dim} 100%)` : "#0c0c0c",
          border: `2px solid ${tiene ? c.accent : "#1f2937"}`,
          boxShadow: tiene ? `0 0 16px ${c.glow}, inset 0 0 20px rgba(0,0,0,0.5)` : "none",
          borderRadius: 3,
        }}
      >
        {/* Corner accent lines — BO3 UI style */}
        {tiene && (
          <>
            <div className="absolute top-0 left-0 w-3 h-0.5" style={{ background: c.accent }} />
            <div className="absolute top-0 left-0 w-0.5 h-3" style={{ background: c.accent }} />
            <div className="absolute bottom-0 right-0 w-3 h-0.5" style={{ background: c.accent }} />
            <div className="absolute bottom-0 right-0 w-0.5 h-3" style={{ background: c.accent }} />
          </>
        )}

        {/* Badge art */}
        <div
          className="absolute inset-0 flex items-center justify-center p-3 transition-all duration-300"
          style={{
            color: tiene ? c.accent : "#374151",
            filter: tiene ? `drop-shadow(0 0 4px ${c.glow})` : "none",
          }}
        >
          {art ?? (
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="24" cy="24" r="16"/>
              <line x1="16" y1="16" x2="32" y2="32"/>
              <line x1="32" y1="16" x2="16" y2="32"/>
            </svg>
          )}
        </div>

        {/* Locked overlay */}
        {!tiene && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <svg viewBox="0 0 24 24" className="w-5 h-5 opacity-30" fill="#9ca3af">
              <rect x="5" y="11" width="14" height="10" rx="1"/>
              <path d="M8 11 V7 A4 4 0 0 1 16 7 V11" fill="none" stroke="#9ca3af" strokeWidth="1.5"/>
            </svg>
          </div>
        )}

        {/* Earned flash overlay */}
        {tiene && (
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: `linear-gradient(135deg, ${c.accent} 0%, transparent 60%)`,
            }}
          />
        )}
      </div>

      {/* Title */}
      <div className="px-0.5">
        <p
          className="font-mono text-[9px] font-bold uppercase tracking-wide leading-tight"
          style={{ color: tiene ? c.accent : "#374151" }}
        >
          {t(`badge.${def.codigo}.titulo` as any) || def.titulo}
        </p>
        {tiene && fecha ? (
          <p className="font-mono text-[8px] mt-0.5 text-fg/40">
            {new Date(fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
          </p>
        ) : (
          <p className="font-mono text-[8px] mt-0.5 leading-tight text-fg/20 px-0.5">
            {t(`badge.${def.codigo}.desc` as any) || def.desc}
          </p>
        )}
      </div>
    </div>
  );
}

const NIVEL_TRANSLATION_KEY: Record<Nivel, "achievements.facil" | "achievements.medio" | "achievements.dificil" | "achievements.legendario"> = {
  facil: "achievements.facil",
  medio: "achievements.medio",
  dificil: "achievements.dificil",
  legendario: "achievements.legendario",
};

export default function PanelInsignias({ insignias }: { insignias: Insignia[] }) {
  const { t } = useLanguage();
  const obtenidas = new Set(insignias.map((i) => i.codigo));
  const fechaMap = Object.fromEntries(insignias.map((i) => [i.codigo, i.otorgada_at]));

  const porNivel = NIVEL_ORDEN.map((nivel) => ({
    nivel,
    badges: BADGES_DEF.filter((b) => b.nivel === nivel),
  }));

  return (
    <div className="flex flex-col gap-8">
      {porNivel.map(({ nivel, badges }) => {
        const c = NIVEL_COLORES[nivel];
        const obtenidas_nivel = badges.filter((b) => obtenidas.has(b.codigo)).length;
        return (
          <div key={nivel}>
            {/* Tier header */}
            <div className="mb-4 flex items-center gap-3">
              <div
                className="h-px flex-1"
                style={{ background: `linear-gradient(to right, ${c.accent}, transparent)` }}
              />
              <span
                className="font-mono text-[10px] font-black uppercase tracking-[0.3em]"
                style={{ color: c.accent }}
              >
                {t(NIVEL_TRANSLATION_KEY[nivel])}
              </span>
              <span className="font-mono text-[10px]" style={{ color: c.accent + "66" }}>
                {obtenidas_nivel}/{badges.length}
              </span>
              <div
                className="h-px flex-1"
                style={{ background: `linear-gradient(to left, ${c.accent}, transparent)` }}
              />
            </div>

            <div className="grid grid-cols-5 gap-4">
              {badges.map((b) => (
                <BadgeTile
                  key={b.codigo}
                  def={b}
                  tiene={obtenidas.has(b.codigo)}
                  fecha={fechaMap[b.codigo]}
                  t={t}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
