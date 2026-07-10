"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { BADGES_DEF, NIVEL_COLORES, NIVEL_ORDEN } from "@/components/PanelInsignias";

interface Participante {
  alumno_id: string;
  nombre: string;
}

// Mapa: alumno_id -> lista de códigos de insignia ganados en el grupo
type InsigniasGrupo = Record<string, string[]>;

/**
 * Panel de consulta para el maestro: muestra las insignias que la app ha
 * otorgado automáticamente a cada alumno del grupo. No hay otorgar manual:
 * el motor de insignias evalúa y entrega las medallas según la actividad.
 */
export default function PanelInsigniasMaestro({
  grupoId,
  participantes,
}: {
  grupoId: string;
  participantes: Participante[];
}) {
  const { t } = useLanguage();
  const [insignias, setInsignias] = useState<InsigniasGrupo>({});
  const [seleccionado, setSeleccionado] = useState<string>("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api
      .get<InsigniasGrupo>(`/insignias/grupo/${grupoId}`)
      .then(setInsignias)
      .catch(() => setInsignias({}))
      .finally(() => setCargando(false));
  }, [grupoId]);

  useEffect(() => {
    if (!seleccionado && participantes.length > 0) {
      setSeleccionado(participantes[0].alumno_id);
    }
  }, [participantes, seleccionado]);

  const ganadas = new Set(insignias[seleccionado] ?? []);

  if (cargando) {
    return <p className="p-4 font-mono text-xs text-fg/40">{t("maestro.detail.loading")}</p>;
  }

  if (participantes.length === 0) {
    return <p className="p-4 font-mono text-xs text-fg/40">{t("maestro.badges.noStudents")}</p>;
  }

  return (
    <div className="mt-4">
      <p className="mb-4 border border-fg/10 bg-fg/5 px-3 py-2 font-mono text-[11px] text-fg/50">
        {t("maestro.badges.autoNote")}
      </p>

      {/* Resumen: conteo de insignias por alumno */}
      <div className="mb-5 overflow-x-auto">
        <table className="w-full border border-fg/10 bg-panel text-sm">
          <thead className="bg-fg/5">
            <tr>
              <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-fg/40">{t("maestro.detail.colStudent")}</th>
              <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-fg/40">{t("maestro.badges.count")}</th>
            </tr>
          </thead>
          <tbody>
            {participantes.map((p) => {
              const n = (insignias[p.alumno_id] ?? []).length;
              return (
                <tr
                  key={p.alumno_id}
                  onClick={() => setSeleccionado(p.alumno_id)}
                  className={`cursor-pointer border-t border-fg/5 ${p.alumno_id === seleccionado ? "bg-accent/10" : "hover:bg-fg/5"}`}
                >
                  <td className="px-4 py-2.5 text-fg">{p.nombre}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-fg/80">{n}/{BADGES_DEF.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detalle de insignias del alumno seleccionado (solo consulta) */}
      <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">
        {t("maestro.badges.badgesOf")}{" "}
        <span className="text-fg">{participantes.find((p) => p.alumno_id === seleccionado)?.nombre ?? "—"}</span>
      </h3>

      {NIVEL_ORDEN.map((nivel) => {
        const c = NIVEL_COLORES[nivel];
        const delNivel = BADGES_DEF.filter((b) => b.nivel === nivel);
        return (
          <div key={nivel} className="mb-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: c.accent }}>
              {c.label}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {delNivel.map((b) => {
                const tiene = ganadas.has(b.codigo);
                return (
                  <div
                    key={b.codigo}
                    className={`flex items-center justify-between gap-2 border px-3 py-2 ${
                      tiene ? "border-accent bg-accent/10" : "border-fg/15 bg-canvas opacity-60"
                    }`}
                    title={b.desc}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-fg">{b.titulo}</span>
                      <span className="block truncate font-mono text-[10px] text-fg/40">{b.desc}</span>
                    </span>
                    <span className={`shrink-0 font-mono text-[10px] font-bold uppercase ${tiene ? "text-accent" : "text-fg/30"}`}>
                      {tiene ? t("maestro.badges.earned") : t("maestro.badges.locked")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
