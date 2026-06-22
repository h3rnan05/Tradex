"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/components/Toast";

interface Reto {
  id: string;
  nombre: string;
  activos_permitidos: string[] | null;
  escenario_id: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  capital_inicial: string;
}

interface Escenario {
  id: string;
  nombre: string;
  descripcion: string;
  tickers_sugeridos: string[];
}

type Modo = "live" | "crisis";

/**
 * Panel del maestro para crear y listar retos del grupo. Dos modos:
 * - "live": lista de activos en vivo (gana quien más dinero haga operándolos).
 * - "crisis": un escenario histórico (COVID, 2008, puntocom...) cuyos precios
 *   se reproducen comprimidos en la duración del reto.
 */
export default function PanelRetosMaestro({ grupoId }: { grupoId: string }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [retos, setRetos] = useState<Reto[] | null>(null);
  const [escenarios, setEscenarios] = useState<Escenario[]>([]);
  const [modo, setModo] = useState<Modo>("live");
  const [nombre, setNombre] = useState("");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [capital, setCapital] = useState("10000");
  const [tickers, setTickers] = useState("");
  const [escenarioId, setEscenarioId] = useState("");
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    api.get<Reto[]>(`/grupos/${grupoId}/retos`).then(setRetos).catch(() => setRetos([]));
  }

  // Formatea una fecha al formato que espera <input type="datetime-local">.
  function paraInput(d: Date) {
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
  }

  // Atajos de duración: arranca ahora y calcula el fin automáticamente.
  function aplicarDuracion(minutos: number) {
    const ahora = new Date();
    const fin = new Date(ahora.getTime() + minutos * 60000);
    setInicio(paraInput(ahora));
    setFin(paraInput(fin));
  }

  useEffect(cargar, [grupoId]);
  useEffect(() => {
    api.get<Escenario[]>("/precios/escenarios").then(setEscenarios).catch(() => setEscenarios([]));
  }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    const activos = tickers.split(",").map((x) => x.trim()).filter(Boolean);
    const baseOk = nombre.trim() && inicio && fin;
    if (!baseOk || (modo === "live" && activos.length === 0) || (modo === "crisis" && !escenarioId)) {
      toast(t("maestro.retos.incomplete"), "error");
      return;
    }
    setGuardando(true);
    try {
      await api.post(`/grupos/${grupoId}/retos`, {
        nombre: nombre.trim(),
        fecha_inicio: new Date(inicio).toISOString(),
        fecha_fin: new Date(fin).toISOString(),
        capital_inicial: capital,
        ...(modo === "live" ? { activos_permitidos: activos } : { escenario_id: escenarioId }),
      });
      toast(t("maestro.retos.created"), "success");
      setNombre(""); setInicio(""); setFin(""); setTickers(""); setEscenarioId(""); setCapital("10000");
      cargar();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t("common.error"), "error");
    } finally {
      setGuardando(false);
    }
  }

  function estado(r: Reto) {
    const ahora = Date.now();
    if (ahora < new Date(r.fecha_inicio).getTime()) return t("class.upcoming");
    if (ahora < new Date(r.fecha_fin).getTime()) return t("class.active");
    return t("class.finished");
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Crear reto */}
      <form onSubmit={crear} className="border border-fg/10 bg-panel p-4">
        <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">{t("maestro.retos.newChallenge")}</h3>

        {/* Toggle de modo */}
        <div className="mb-4 flex gap-1">
          {(["live", "crisis"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModo(m)}
              className={`flex-1 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider ${
                modo === m ? "bg-accent text-black" : "border border-fg/20 text-fg/60 hover:text-fg"
              }`}
            >
              {m === "live" ? t("maestro.retos.modeLive") : t("maestro.retos.modeCrisis")}
            </button>
          ))}
        </div>

        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg/50">{t("maestro.retos.name")}</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={t("maestro.retos.namePlaceholder")}
          className="mb-3 w-full border border-fg/20 bg-canvas px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        {/* Atajos de duración */}
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg/50">{t("maestro.retos.duration")}</label>
        <div className="mb-3 flex gap-1">
          {[
            { label: "30 min", min: 30 },
            { label: "1 hora", min: 60 },
            { label: "1 día", min: 1440 },
          ].map((d) => (
            <button
              key={d.min}
              type="button"
              onClick={() => aplicarDuracion(d.min)}
              className="flex-1 border border-fg/20 px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-fg/60 hover:border-accent hover:text-fg"
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg/50">{t("maestro.retos.start")}</label>
            <input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} className="w-full border border-fg/20 bg-canvas px-2 py-2 font-mono text-xs focus:border-accent focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg/50">{t("maestro.retos.end")}</label>
            <input type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} className="w-full border border-fg/20 bg-canvas px-2 py-2 font-mono text-xs focus:border-accent focus:outline-none" />
          </div>
        </div>
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg/50">{t("maestro.retos.capital")}</label>
        <input type="number" min="1" value={capital} onChange={(e) => setCapital(e.target.value)} className="mb-3 w-full border border-fg/20 bg-canvas px-3 py-2 text-sm focus:border-accent focus:outline-none" />
        {modo === "live" ? (
          <>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg/50">{t("maestro.retos.assets")}</label>
            <input
              value={tickers}
              onChange={(e) => setTickers(e.target.value)}
              placeholder="AAPL, BABA, BTC-USD"
              className="mb-1 w-full border border-fg/20 bg-canvas px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none"
            />
            <p className="mb-3 font-mono text-[10px] text-fg/40">{t("maestro.retos.assetsHint")}</p>
          </>
        ) : (
          <>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg/50">{t("maestro.retos.scenario")}</label>
            <select
              value={escenarioId}
              onChange={(e) => setEscenarioId(e.target.value)}
              className="mb-1 w-full border border-fg/20 bg-canvas px-3 py-2 text-sm focus:border-accent focus:outline-none"
            >
              <option value="">{t("maestro.retos.pickScenario")}</option>
              {escenarios.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
            <p className="mb-3 font-mono text-[10px] text-fg/40">
              {escenarios.find((e) => e.id === escenarioId)?.descripcion ?? t("maestro.retos.scenarioHint")}
            </p>
          </>
        )}
        <button type="submit" disabled={guardando} className="w-full bg-accent px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-black hover:opacity-90 disabled:opacity-50">
          {t("maestro.retos.create")}
        </button>
      </form>

      {/* Lista de retos */}
      <div>
        <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">{t("maestro.retos.existing")}</h3>
        {!retos ? (
          <p className="font-mono text-xs text-fg/40">{t("common.loading")}</p>
        ) : retos.length === 0 ? (
          <p className="font-mono text-xs text-fg/40">{t("maestro.retos.none")}</p>
        ) : (
          <ul className="space-y-2">
            {retos.map((r) => (
              <li key={r.id}>
                <Link href={`/maestro/retos/${r.id}`} className="block border border-fg/10 bg-panel p-3 hover:border-accent">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-fg">{r.nombre}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fg/50">{estado(r)}</span>
                  </div>
                  {r.activos_permitidos && r.activos_permitidos.length > 0 && (
                    <p className="mt-1 truncate font-mono text-[10px] text-fg/40">
                      {r.activos_permitidos.map((a) => a.replace("-USD", "").replace("=X", "").replace(".MX", "")).join(", ")}
                    </p>
                  )}
                  <p className="font-mono text-[10px] text-fg/40">{new Date(r.fecha_fin).toLocaleString("es-MX")}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
