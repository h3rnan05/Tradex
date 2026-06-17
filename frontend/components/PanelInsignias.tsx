interface Insignia {
  codigo: string;
  otorgada_at: string;
}

// SVG icons styled like GTA achievement medals
const IconoPrimeraOrden = () => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="20" cy="20" r="18" strokeWidth="2" stroke="currentColor" />
    <line x1="20" y1="8" x2="20" y2="20" strokeWidth="2.5" strokeLinecap="round" stroke="currentColor" />
    <circle cx="20" cy="24" r="2.5" fill="currentColor" />
    <line x1="13" y1="28" x2="27" y2="28" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
  </svg>
);

const IconoPrimeraGanancia = () => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="20" cy="20" r="18" strokeWidth="2" stroke="currentColor" />
    <path d="M12 26 L17 19 L22 23 L28 14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" />
    <polyline points="24,14 28,14 28,18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" />
  </svg>
);

const IconoDiversificado = () => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="20" cy="20" r="18" strokeWidth="2" stroke="currentColor" />
    <circle cx="20" cy="20" r="5" strokeWidth="1.5" stroke="currentColor" />
    <line x1="20" y1="10" x2="20" y2="15" strokeWidth="1.5" stroke="currentColor" />
    <line x1="20" y1="25" x2="20" y2="30" strokeWidth="1.5" stroke="currentColor" />
    <line x1="10" y1="20" x2="15" y2="20" strokeWidth="1.5" stroke="currentColor" />
    <line x1="25" y1="20" x2="30" y2="20" strokeWidth="1.5" stroke="currentColor" />
    <line x1="13.4" y1="13.4" x2="16.9" y2="16.9" strokeWidth="1.5" stroke="currentColor" />
    <line x1="23.1" y1="23.1" x2="26.6" y2="26.6" strokeWidth="1.5" stroke="currentColor" />
    <line x1="26.6" y1="13.4" x2="23.1" y2="16.9" strokeWidth="1.5" stroke="currentColor" />
    <line x1="16.9" y1="23.1" x2="13.4" y2="26.6" strokeWidth="1.5" stroke="currentColor" />
  </svg>
);

const IconoVender = () => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="20" cy="20" r="18" strokeWidth="2" stroke="currentColor" />
    <rect x="12" y="14" width="16" height="12" rx="1" strokeWidth="1.8" stroke="currentColor" />
    <path d="M16 14 L16 12 Q16 10 20 10 Q24 10 24 12 L24 14" strokeWidth="1.8" stroke="currentColor" strokeLinejoin="round" />
    <line x1="16" y1="19" x2="24" y2="19" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
    <line x1="20" y1="17" x2="20" y2="21" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
    <path d="M26 24 L30 28" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
    <line x1="28" y1="26" x2="32" y2="22" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
  </svg>
);

const IconoOperadorActivo = () => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="20" cy="20" r="18" strokeWidth="2" stroke="currentColor" />
    <path d="M12 20 L16 13 L20 24 L24 16 L28 20" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" />
  </svg>
);

const IconoEstudiante = () => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="20" cy="20" r="18" strokeWidth="2" stroke="currentColor" />
    <polygon points="20,11 30,16 20,21 10,16" strokeWidth="1.8" stroke="currentColor" strokeLinejoin="round" />
    <path d="M14 19 L14 26 Q20 30 26 26 L26 19" strokeWidth="1.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="30" y1="16" x2="30" y2="22" strokeWidth="1.8" stroke="currentColor" strokeLinecap="round" />
  </svg>
);

const BADGES_DEF = [
  { codigo: "primera_orden",          Icono: IconoPrimeraOrden,   titulo: "Primera Orden",        desc: "Ejecutaste tu primera operación" },
  { codigo: "primera_ganancia",       Icono: IconoPrimeraGanancia,titulo: "Primera Ganancia",      desc: "Tienes una posición con ganancias" },
  { codigo: "portafolio_diversificado",Icono: IconoDiversificado,  titulo: "Diversificado",         desc: "Tienes 5 o más activos distintos" },
  { codigo: "sin_miedo_a_vender",     Icono: IconoVender,         titulo: "Sin Miedo a Vender",   desc: "Ejecutaste tu primera venta" },
  { codigo: "operador_activo",        Icono: IconoOperadorActivo, titulo: "Operador Activo",       desc: "10 o más operaciones realizadas" },
  { codigo: "primera_leccion",        Icono: IconoEstudiante,     titulo: "Estudiante",            desc: "Completaste tu primera lección" },
];

export default function PanelInsignias({ insignias }: { insignias: Insignia[] }) {
  const obtenidas = new Set(insignias.map((i) => i.codigo));
  const fechaMap = Object.fromEntries(insignias.map((i) => [i.codigo, i.otorgada_at]));

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {BADGES_DEF.map((b) => {
        const tiene = obtenidas.has(b.codigo);
        const fecha = fechaMap[b.codigo];
        return (
          <div key={b.codigo} className="flex flex-col items-center gap-2 text-center">
            {/* Medal shape */}
            <div className="relative">
              {/* Outer ring */}
              <div
                className={`relative flex items-center justify-center transition-all duration-300 ${
                  tiene
                    ? "drop-shadow-[0_0_8px_rgba(255,102,0,0.5)]"
                    : "opacity-35 grayscale"
                }`}
                style={{ width: 72, height: 72 }}
              >
                {/* Hexagon background */}
                <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full">
                  <polygon
                    points="40,4 74,22 74,58 40,76 6,58 6,22"
                    fill={tiene ? "#1a1008" : "#1a1a1a"}
                    stroke={tiene ? "#f60" : "#444"}
                    strokeWidth={tiene ? "3" : "2"}
                  />
                  {/* Inner ring */}
                  <polygon
                    points="40,10 68,25 68,55 40,70 12,55 12,25"
                    fill="none"
                    stroke={tiene ? "rgba(255,102,0,0.3)" : "rgba(100,100,100,0.2)"}
                    strokeWidth="1"
                  />
                </svg>
                {/* Icon */}
                <div
                  className="relative z-10"
                  style={{ width: 34, height: 34, color: tiene ? "#f60" : "#555" }}
                >
                  <b.Icono />
                </div>
              </div>

              {/* Lock overlay */}
              {!tiene && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 16 16" className="w-5 h-5 opacity-60" fill="#888">
                    <rect x="3" y="7" width="10" height="8" rx="1" />
                    <path d="M5 7 V5 A3 3 0 0 1 11 5 V7" fill="none" stroke="#888" strokeWidth="1.5" />
                  </svg>
                </div>
              )}
            </div>

            <div>
              <p className={`font-mono text-[10px] font-bold uppercase tracking-wide leading-tight ${tiene ? "text-fg" : "text-fg/30"}`}>
                {b.titulo}
              </p>
              {tiene && fecha ? (
                <p className="font-mono text-[9px] text-accent/70 mt-0.5">
                  {new Date(fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                </p>
              ) : (
                <p className="font-mono text-[9px] text-fg/25 mt-0.5">{b.desc}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
