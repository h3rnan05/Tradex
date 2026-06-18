"use client";

import { useLanguage } from "@/lib/i18n";

interface Insignia {
  codigo: string;
  otorgada_at: string;
}

type Nivel = "facil" | "medio" | "dificil" | "legendario";

interface BadgeDef {
  codigo: string;
  titulo: string;
  desc: string;
  nivel: Nivel;
}

const NIVEL_COLORES: Record<Nivel, { border: string; bg: string; text: string; glow: string; label: string }> = {
  facil:      { border: "#6b7280", bg: "#1f2937", text: "#9ca3af", glow: "rgba(107,114,128,0.4)",  label: "Fácil" },
  medio:      { border: "#3b82f6", bg: "#1e3a5f", text: "#60a5fa", glow: "rgba(59,130,246,0.45)",  label: "Medio" },
  dificil:    { border: "#f59e0b", bg: "#2d1f00", text: "#fbbf24", glow: "rgba(245,158,11,0.5)",   label: "Difícil" },
  legendario: { border: "#a855f7", bg: "#2e1065", text: "#c084fc", glow: "rgba(168,85,247,0.55)",  label: "Legendario" },
};

const BADGES_DEF: BadgeDef[] = [
  // Fáciles
  { codigo: "primera_orden",            titulo: "Primera Orden",         desc: "Ejecuta tu primera operación",                   nivel: "facil" },
  { codigo: "sin_miedo_a_vender",       titulo: "Sin Miedo a Vender",    desc: "Ejecuta tu primera venta",                       nivel: "facil" },
  { codigo: "primera_ganancia",         titulo: "Primera Ganancia",      desc: "Ten una posición en verde",                      nivel: "facil" },
  { codigo: "short_seller",             titulo: "Short Seller",          desc: "Abre tu primera posición en corto",              nivel: "facil" },
  { codigo: "alerta_puesta",            titulo: "Vigilante",             desc: "Configura tu primera alerta de precio",          nivel: "facil" },
  // Medios
  { codigo: "operador_activo",          titulo: "Operador Activo",       desc: "Realiza 10 o más operaciones",                   nivel: "medio" },
  { codigo: "portafolio_diversificado", titulo: "Diversificado",         desc: "Ten 5 o más activos distintos",                  nivel: "medio" },
  { codigo: "explorador_mercados",      titulo: "Explorador",            desc: "Opera en 3 categorías de activos distintas",     nivel: "medio" },
  { codigo: "cazador_de_cripto",        titulo: "Hodler",                desc: "Ten Bitcoin o Ethereum en cartera",              nivel: "medio" },
  { codigo: "orden_limite_ejecutada",   titulo: "Precisión Quirúrgica",  desc: "Ejecuta una orden límite automáticamente",       nivel: "medio" },
  // Difíciles
  { codigo: "operador_veterano",        titulo: "Veterano",              desc: "Realiza 50 o más operaciones",                   nivel: "dificil" },
  { codigo: "gran_cartera",             titulo: "Gran Cartera",          desc: "Ten 10 o más activos simultáneamente",           nivel: "dificil" },
  { codigo: "rentabilidad_10",          titulo: "Rentable",              desc: "Logra un rendimiento mayor al 10%",              nivel: "dificil" },
  { codigo: "diversificado_global",     titulo: "Diversificado Global",  desc: "Opera en 5 o más categorías de activos",        nivel: "dificil" },
  { codigo: "riesgo_calculado",         titulo: "Riesgo Calculado",      desc: "Ten posiciones largas Y cortas al mismo tiempo", nivel: "dificil" },
  // Legendarios
  { codigo: "centenar",                 titulo: "El Centenar",           desc: "Realiza 100 o más operaciones",                  nivel: "legendario" },
  { codigo: "rentabilidad_50",          titulo: "Genio Financiero",      desc: "Logra un rendimiento mayor al 50%",              nivel: "legendario" },
  { codigo: "maestro_del_mercado",      titulo: "Maestro del Mercado",   desc: "Opera en las 6 categorías disponibles",         nivel: "legendario" },
  { codigo: "ballena",                  titulo: "Ballena",               desc: "Duplica tu capital inicial",                    nivel: "legendario" },
  { codigo: "sin_rendirse",             titulo: "Constancia",            desc: "Opera en 5 días distintos",                     nivel: "legendario" },
];

const NIVEL_ORDEN: Nivel[] = ["facil", "medio", "dificil", "legendario"];

function BadgeHex({ def, tiene, fecha, t }: { def: BadgeDef; tiene: boolean; fecha?: string; t: (k: any) => string }) {
  const c = NIVEL_COLORES[def.nivel];
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div
        className="relative flex items-center justify-center transition-all duration-300"
        style={{
          width: 64, height: 64,
          filter: tiene ? `drop-shadow(0 0 7px ${c.glow})` : undefined,
          opacity: tiene ? 1 : 0.35,
        }}
      >
        <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full">
          <polygon
            points="40,4 74,22 74,58 40,76 6,58 6,22"
            fill={tiene ? c.bg : "#111"}
            stroke={tiene ? c.border : "#333"}
            strokeWidth={tiene ? "3" : "1.5"}
          />
          <polygon
            points="40,11 67,26 67,54 40,69 13,54 13,26"
            fill="none"
            stroke={tiene ? c.border : "#222"}
            strokeWidth="1"
            strokeOpacity="0.4"
          />
        </svg>
        <span
          className="relative z-10 select-none"
          style={{ fontSize: 22, lineHeight: 1, filter: tiene ? "none" : "grayscale(1)" }}
        >
          {NIVEL_ICONO[def.codigo] ?? "⭐"}
        </span>
        {!tiene && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 16 16" className="w-4 h-4 opacity-50" fill="#666">
              <rect x="3" y="7" width="10" height="8" rx="1" />
              <path d="M5 7 V5 A3 3 0 0 1 11 5 V7" fill="none" stroke="#666" strokeWidth="1.5" />
            </svg>
          </div>
        )}
      </div>
      <div>
        <p className={`font-mono text-[9px] font-bold uppercase tracking-wide leading-tight ${tiene ? "text-fg" : "text-fg/25"}`}>
          {t(`badge.${def.codigo}.titulo` as any) || def.titulo}
        </p>
        {tiene && fecha ? (
          <p className="font-mono text-[8px] mt-0.5" style={{ color: c.text }}>
            {new Date(fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
          </p>
        ) : (
          <p className="font-mono text-[8px] text-fg/20 mt-0.5 leading-tight px-1">{t(`badge.${def.codigo}.desc` as any) || def.desc}</p>
        )}
      </div>
    </div>
  );
}

const NIVEL_ICONO: Record<string, string> = {
  primera_orden: "🔰", sin_miedo_a_vender: "📤", primera_ganancia: "📈",
  short_seller: "🔻", alerta_puesta: "🔔",
  operador_activo: "⚡", portafolio_diversificado: "🗂", explorador_mercados: "🌐",
  cazador_de_cripto: "₿", orden_limite_ejecutada: "🎯",
  operador_veterano: "🏆", gran_cartera: "💼", rentabilidad_10: "🚀",
  diversificado_global: "🗺", riesgo_calculado: "⚖",
  centenar: "💯", rentabilidad_50: "🌟", maestro_del_mercado: "👑",
  ballena: "🐋", sin_rendirse: "🔥",
};

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
    <div className="flex flex-col gap-5">
      {porNivel.map(({ nivel, badges }) => {
        const c = NIVEL_COLORES[nivel];
        const obtenidas_nivel = badges.filter((b) => obtenidas.has(b.codigo)).length;
        return (
          <div key={nivel}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="font-mono text-[10px] font-bold uppercase tracking-widest"
                style={{ color: c.text }}
              >
                {t(NIVEL_TRANSLATION_KEY[nivel])}
              </span>
              <span className="font-mono text-[10px] text-fg/30">
                {obtenidas_nivel}/{badges.length}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {badges.map((b) => (
                <BadgeHex
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
