interface Insignia {
  codigo: string;
  otorgada_at: string;
}

const BADGES_DEF = [
  { codigo: "primera_orden", emoji: "🎯", titulo: "Primera Orden", desc: "Ejecutaste tu primera operación" },
  { codigo: "primera_ganancia", emoji: "💰", titulo: "Primera Ganancia", desc: "Tienes una posición con ganancias" },
  { codigo: "portafolio_diversificado", emoji: "🌐", titulo: "Diversificado", desc: "Tienes 5 o más activos distintos" },
  { codigo: "sin_miedo_a_vender", emoji: "📤", titulo: "Sin Miedo a Vender", desc: "Ejecutaste tu primera venta" },
  { codigo: "operador_activo", emoji: "⚡", titulo: "Operador Activo", desc: "10 o más operaciones realizadas" },
  { codigo: "primera_leccion", emoji: "📚", titulo: "Estudiante", desc: "Completaste tu primera lección" },
];

export default function PanelInsignias({ insignias }: { insignias: Insignia[] }) {
  const obtenidas = new Set(insignias.map((i) => i.codigo));
  const fechaMap = Object.fromEntries(insignias.map((i) => [i.codigo, i.otorgada_at]));

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {BADGES_DEF.map((b) => {
        const tiene = obtenidas.has(b.codigo);
        const fecha = fechaMap[b.codigo];
        return (
          <div
            key={b.codigo}
            className={`flex flex-col items-center gap-1.5 border p-4 text-center transition-all ${
              tiene ? "border-accent/40 bg-accent/5" : "border-fg/10 bg-panel opacity-50"
            }`}
          >
            <span className={`text-3xl ${tiene ? "" : "grayscale"}`}>{b.emoji}</span>
            <span className={`font-mono text-[11px] font-bold uppercase tracking-wide ${tiene ? "text-fg" : "text-fg/40"}`}>
              {b.titulo}
            </span>
            <span className="font-mono text-[10px] text-fg/50 leading-tight">{b.desc}</span>
            {tiene && fecha && (
              <span className="font-mono text-[9px] text-accent/70">
                {new Date(fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
            {!tiene && <span className="font-mono text-[10px] text-fg/30">🔒 Pendiente</span>}
          </div>
        );
      })}
    </div>
  );
}
