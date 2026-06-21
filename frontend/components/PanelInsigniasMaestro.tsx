"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { BADGES_DEF, NIVEL_COLORES, NIVEL_ORDEN } from "@/components/PanelInsignias";

interface Participante {
  alumno_id: string;
  nombre: string;
}

// Mapa: alumno_id -> lista de códigos de insignia ganados en el grupo
type InsigniasGrupo = Record<string, string[]>;

/**
 * Panel para el maestro: ver las insignias de cada alumno del grupo y
 * otorgar/revocar manualmente cualquier insignia del catálogo.
 */
export default function PanelInsigniasMaestro({
  grupoId,
  participantes,
}: {
  grupoId: string;
  participantes: Participante[];
}) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [insignias, setInsignias] = useState<InsigniasGrupo>({});
  const [seleccionado, setSeleccionado] = useState<string>("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<string | null>(null);

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

  async function alternar(codigo: string, tiene: boolean) {
    if (!seleccionado) return;
    setGuardando(codigo);
    try {
      const ruta = tiene ? "/insignias/revocar" : "/insignias/otorgar";
      await api.post(ruta, { alumno_id: seleccionado, codigo, grupo_id: grupoId });
      setInsignias((prev) => {
        const actuales = new Set(prev[seleccionado] ?? []);
        if (tiene) actuales.delete(codigo);
        else actuales.add(codigo);
        return { ...prev, [seleccionado]: Array.from(actuales) };
      });
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setGuardando(null);
    }
  }

  if (cargando) {
    return <p className="p-4 font-mono text-xs text-fg/40">{t("maestro.detail.loading")}</p>;
  }

  if (participantes.length === 0) {
    return <p className="p-4 font-mono text-xs text-fg/40">{t("maestro.badges.noStudents")}</p>;
  }

  return (
    <div className="mt-4">
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

      {/* Catálogo para el alumno seleccionado */}
      <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">
        {t("maestro.badges.manageFor")}{" "}
        <span className="text-fg">{participantes.find((p) => p.alumno_id === seleccionado)?.nombre ?? "—"}</span>
      </h3>

      {NIVEL_ORDEN.map((nivel) => {
        const c = NIVEL_COLORES[nivel];
        const delNivel = BADGES_DEF.filter((b) => b.nivel === nivel);
        return (
          <div key={nivel} className="mb-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: c.border }}>
              {c.label}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {delNivel.map((b) => {
                const tiene = ganadas.has(b.codigo);
                return (
                  <button
                    key={b.codigo}
                    type="button"
                    disabled={guardando === b.codigo}
                    onClick={() => alternar(b.codigo, tiene)}
                    className={`flex items-center justify-between gap-2 border px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                      tiene
                        ? "border-accent bg-accent/10"
                        : "border-fg/15 bg-canvas hover:border-fg/30"
                    }`}
                    title={b.desc}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-fg">{b.titulo}</span>
                      <span className="block truncate font-mono text-[10px] text-fg/40">{b.desc}</span>
                    </span>
                    <span className={`shrink-0 font-mono text-[10px] font-bold uppercase ${tiene ? "text-accent" : "text-fg/40"}`}>
                      {tiene ? t("maestro.badges.granted") : t("maestro.badges.grant")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
