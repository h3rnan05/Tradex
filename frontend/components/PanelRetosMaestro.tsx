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

/**
 * Panel del maestro para crear y listar retos temáticos del grupo:
 * un período + una lista de activos permitidos. Gana quien termine con
 * más dinero operando solo esos activos (sandbox con capital virtual).
 */
export default function PanelRetosMaestro({ grupoId }: { grupoId: string }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [retos, setRetos] = useState<Reto[] | null>(null);
  const [nombre, setNombre] = useState("");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [capital, setCapital] = useState("10000");
  const [tickers, setTickers] = useState("");
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    api.get<Reto[]>(`/grupos/${grupoId}/retos`).then(setRetos).catch(() => setRetos([]));
  }

  useEffect(cargar, [grupoId]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    const activos = tickers.split(",").map((x) => x.trim()).filter(Boolean);
    if (!nombre.trim() || !inicio || !fin || activos.length === 0) {
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
        activos_permitidos: activos,
      });
      toast(t("maestro.retos.created"), "success");
      setNombre(""); setInicio(""); setFin(""); setTickers(""); setCapital("10000");
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
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg/50">{t("maestro.retos.name")}</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={t("maestro.retos.namePlaceholder")}
          className="mb-3 w-full border border-fg/20 bg-canvas px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
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
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fg/50">{t("maestro.retos.assets")}</label>
        <input
          value={tickers}
          onChange={(e) => setTickers(e.target.value)}
          placeholder="AAPL, BABA, BTC-USD"
          className="mb-1 w-full border border-fg/20 bg-canvas px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none"
        />
        <p className="mb-3 font-mono text-[10px] text-fg/40">{t("maestro.retos.assetsHint")}</p>
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
