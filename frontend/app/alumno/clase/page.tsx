"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api, ApiError } from "@/lib/api";
import { obtenerSesion } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

interface MiClase {
  grupo_id: string;
  nombre: string;
  codigo: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  capital_inicial: string;
  capital_disponible: string;
  valor_total: string;
  pausado: boolean;
  activos_permitidos: string[];
}

export default function ClasePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [clases, setClases] = useState<MiClase[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [uniendose, setUniendose] = useState(false);
  const [errorUnirse, setErrorUnirse] = useState<string | null>(null);
  const [exitoUnirse, setExitoUnirse] = useState<string | null>(null);
  const [confirmandoSalir, setConfirmandoSalir] = useState<string | null>(null);

  const sesion = obtenerSesion();

  async function cargar() {
    if (!sesion) return;
    try {
      const data = await api.get<MiClase[]>(`/alumnos/${sesion.userId}/grupos`);
      setClases(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("class.loadError"));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function unirse(e: React.FormEvent) {
    e.preventDefault();
    setUniendose(true);
    setErrorUnirse(null);
    setExitoUnirse(null);
    try {
      await api.post("/grupos/unirse", { codigo: codigo.trim().toUpperCase() });
      setExitoUnirse(t("class.joinSuccess"));
      setCodigo("");
      cargar();
    } catch (err) {
      setErrorUnirse(err instanceof ApiError ? err.message : t("class.invalidCode"));
    } finally {
      setUniendose(false);
    }
  }

  async function salir(grupo_id: string) {
    if (!sesion) return;
    try {
      await api.delete(`/alumnos/${sesion.userId}/grupos/${grupo_id}`);
      setConfirmandoSalir(null);
      cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("class.leaveError"));
    }
  }

  function fmt(v: string) {
    return Number(v).toLocaleString("en-US", { style: "currency", currency: "USD" });
  }

  function rendimiento(cl: MiClase) {
    return Number(cl.valor_total) - Number(cl.capital_inicial);
  }

  const hoy = new Date();

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-1 font-mono text-[11px] uppercase tracking-widest text-accent">{t("nav.student")}</h1>
        <h2 className="mb-6 text-2xl font-bold text-fg">{t("class.title")}</h2>

        {/* Join form */}
        <form onSubmit={unirse} className="mb-8 flex flex-col sm:flex-row gap-3 items-start">
          <div className="flex-1">
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder={t("login.groupCodePlaceholder")}
              maxLength={6}
              className="w-full border border-fg/20 bg-panel px-4 py-2 font-mono text-sm uppercase tracking-widest text-fg outline-none focus:border-accent"
            />
            {errorUnirse && <p className="mt-1 text-xs text-perdida">{errorUnirse}</p>}
            {exitoUnirse && <p className="mt-1 text-xs text-ganancia">{exitoUnirse}</p>}
          </div>
          <button
            type="submit"
            disabled={uniendose || !codigo.trim()}
            className="bg-accent px-6 py-2 font-mono text-sm font-bold uppercase tracking-wide text-black hover:opacity-90 disabled:opacity-50"
          >
            {uniendose ? t("class.joining") : t("class.join")}
          </button>
        </form>

        {/* Classes list */}
        {cargando ? (
          <p className="text-sm text-fg/40">{t("common.loading")}</p>
        ) : error ? (
          <p className="text-sm text-perdida">{error}</p>
        ) : clases.length === 0 ? (
          <div className="border border-fg/10 bg-panel p-8 text-center">
            <p className="text-fg/40 text-sm">{t("class.noGroups")}</p>
            <p className="mt-1 text-fg/30 text-xs">{t("login.groupCodeHint")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {clases.map((cl) => {
              const r = rendimiento(cl);
              const rPct = Number(cl.capital_inicial) > 0 ? (r / Number(cl.capital_inicial)) * 100 : 0;
              const activa = new Date(cl.fecha_fin) >= hoy;
              return (
                <div key={cl.grupo_id} className={`border bg-panel p-5 ${cl.pausado ? "border-perdida/40" : "border-fg/10"}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-bold text-fg">{cl.nombre}</p>
                      <p className="font-mono text-[10px] text-fg/40 mt-0.5">
                        {new Date(cl.fecha_inicio).toLocaleDateString("es-MX")} &rarr; {new Date(cl.fecha_fin).toLocaleDateString("es-MX")}
                      </p>
                    </div>
                    <span className={`shrink-0 font-mono text-[10px] uppercase px-2 py-0.5 ${activa ? "bg-ganancia/10 text-ganancia" : "bg-fg/10 text-fg/40"}`}>
                      {activa ? t("class.active") : t("class.finished")}
                    </span>
                  </div>

                  {cl.pausado && (
                    <p className="mb-3 font-mono text-[10px] text-perdida uppercase tracking-wider">{t("class.paused")}</p>
                  )}

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-fg/40">{t("common.value")}</p>
                      <p className="font-mono text-sm font-bold text-fg">{fmt(cl.valor_total)}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-fg/40">{t("ranking.return")}</p>
                      <p className={`font-mono text-sm font-bold ${r >= 0 ? "text-ganancia" : "text-perdida"}`}>
                        {r >= 0 ? "+" : ""}{rPct.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-fg/40">{t("markets.title")}</p>
                      <p className="font-mono text-[10px] text-fg/60">{cl.activos_permitidos.join(", ")}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/alumno/portafolio?grupo_id=${cl.grupo_id}`)}
                      className="flex-1 bg-accent py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-black hover:opacity-90"
                    >
                      {t("portfolio.title")}
                    </button>
                    {confirmandoSalir === cl.grupo_id ? (
                      <>
                        <button onClick={() => salir(cl.grupo_id)} className="border border-perdida px-3 py-1.5 font-mono text-[10px] text-perdida hover:bg-perdida/10">
                          {t("common.confirm")}
                        </button>
                        <button onClick={() => setConfirmandoSalir(null)} className="border border-fg/20 px-3 py-1.5 font-mono text-[10px] text-fg/50">
                          {t("common.cancel")}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmandoSalir(cl.grupo_id)}
                        className="border border-fg/20 px-3 py-1.5 font-mono text-[10px] text-fg/50 hover:border-perdida hover:text-perdida"
                      >
                        {t("class.leaveGroup")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
