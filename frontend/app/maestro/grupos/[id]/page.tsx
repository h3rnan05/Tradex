"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/Toast";
import ComentariosMaestro from "@/components/ComentariosMaestro";
import Pagination from "@/components/Pagination";
import ErrorState from "@/components/ErrorState";
import ConfirmModal from "@/components/ConfirmModal";
import ActivosCategoria from "@/components/ActivosCategoria";
import { useLanguage } from "@/lib/i18n";
import type { TranslationKey } from "@/translations/es";

interface Membership {
  id: string;
  alumno_id: string;
  capital_disponible: string;
  pausado: boolean;
  created_at: string | null;
}

interface Holding {
  id: string;
  alumno_id: string;
  ticker: string;
  cantidad: string;
  precio_promedio: string;
}

interface Orden {
  id: string;
  alumno_id: string;
  ticker: string;
  tipo: "compra" | "venta";
  cantidad: string;
  precio_ejecucion: string;
  comision: string;
  timestamp: string;
}

interface GrupoDetalle {
  id: string;
  nombre: string;
  codigo: string | null;
  capital_inicial: string;
  fecha_inicio: string;
  fecha_fin: string;
  max_alumnos: number | null;
  activos_permitidos: string[];
  limite_orden_valor: string | null;
  comision_porcentaje: string;
  fases_activo: { id: string; tipo_activo: string; fecha_activacion: string }[];
  memberships: Membership[];
  holdings: Holding[];
  ordenes: Orden[];
}

interface EvaluacionEntry {
  alumno_id: string;
  nombre: string;
  escuela: string | null;
  ciudad: string | null;
  estado: string | null;
  posicion: number;
  valor_total: string;
  capital_inicial: string;
  rendimiento: string;
  rendimiento_porcentaje: string;
  comisiones_pagadas: string;
  num_operaciones: number;
  tickers: string[];
  dias_activo: number;
  pausado: boolean;
}

const CAPITALES = [5000, 10000, 25000, 100000];
const COMISIONES: { labelKey?: TranslationKey; label?: string; value: string }[] = [
  { labelKey: "maestro.detail.commissionFree", value: "0" },
  { label: "1%", value: "0.01" },
  { label: "2%", value: "0.02" },
  { label: "5%", value: "0.05" },
  { label: "10%", value: "0.10" },
];
const MERCADOS: { value: string; labelKey: TranslationKey }[] = [
  { value: "acciones", labelKey: "maestro.groups.assetAcciones" },
  { value: "indices", labelKey: "maestro.groups.assetIndicesShort" },
  { value: "commodities", labelKey: "maestro.groups.assetCommodities" },
  { value: "crypto", labelKey: "maestro.groups.assetCrypto" },
  { value: "forex", labelKey: "maestro.groups.assetForex" },
  { value: "bolsa_mx", labelKey: "maestro.groups.assetBolsaMx" },
];
const fmt = (v: string | number) =>
  Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export default function DetalleGrupoPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const params = useParams<{ id: string }>();
  const [grupo, setGrupo] = useState<GrupoDetalle | null>(null);
  const [evaluacion, setEvaluacion] = useState<EvaluacionEntry[]>([]);
  const [tab, setTab] = useState<"config" | "participantes">("participantes");
  const [error, setError] = useState<string | null>(null);
  const [pendingPause, setPendingPause] = useState<{ membershipId: string; alumnoNombre: string; pausado: boolean } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ membershipId: string; alumnoNombre: string } | null>(null);
  const [pendingRegen, setPendingRegen] = useState(false);
  const [exportando, setExportando] = useState(false);

  // Invitar
  const [emailInvitar, setEmailInvitar] = useState("");
  const [mensajeInvitar, setMensajeInvitar] = useState<string | null>(null);
  const [inviteOk, setInviteOk] = useState(false);

  // Config form state (initialized from grupo)
  const [cfgNombre, setCfgNombre] = useState("");
  const [cfgCapital, setCfgCapital] = useState(10000);
  const [cfgMercados, setCfgMercados] = useState<string[]>(["acciones"]);
  const [cfgFechaInicio, setCfgFechaInicio] = useState("");
  const [cfgFechaFin, setCfgFechaFin] = useState("");
  const [cfgComision, setCfgComision] = useState("0");
  const [cfgLimiteOrden, setCfgLimiteOrden] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [msgConfig, setMsgConfig] = useState<string | null>(null);
  const [configOk, setConfigOk] = useState(false);
  const [ordenExpandida, setOrdenExpandida] = useState<string | null>(null);
  const [pageOrdenes, setPageOrdenes] = useState(1);
  const ORDENES_PER_PAGE = 30;

  async function cargar() {
    try {
      const data = await api.get<GrupoDetalle>(`/grupos/${params.id}`);
      setGrupo(data);
      // Sync config form
      setCfgNombre(data.nombre);
      const cap = Number(data.capital_inicial);
      setCfgCapital(CAPITALES.includes(cap) ? cap : 10000);
      setCfgMercados(data.activos_permitidos);
      setCfgFechaInicio(data.fecha_inicio.slice(0, 10));
      setCfgFechaFin(data.fecha_fin.slice(0, 10));
      const comVal = Number(data.comision_porcentaje).toFixed(2);
      setCfgComision(comVal === "0.00" ? "0" : comVal);
      setCfgLimiteOrden(data.limite_orden_valor ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("maestro.detail.loadError"));
    }
  }

  async function cargarEvaluacion() {
    try {
      const data = await api.get<EvaluacionEntry[]>(`/grupos/${params.id}/evaluacion`);
      setEvaluacion(data);
    } catch {
      // silent
    }
  }

  useEffect(() => {
    cargar();
    cargarEvaluacion();
  }, [params.id]);

  async function invitar(e: React.FormEvent) {
    e.preventDefault();
    setMensajeInvitar(null);
    try {
      await api.post(`/grupos/${params.id}/invitar`, { alumno_email: emailInvitar });
      setMensajeInvitar(t("maestro.detail.studentAdded"));
      setInviteOk(true);
      setEmailInvitar("");
      cargar();
      cargarEvaluacion();
    } catch (err) {
      setInviteOk(false);
      setMensajeInvitar(err instanceof ApiError ? err.message : t("maestro.detail.inviteError"));
    }
  }

  async function guardarConfig(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setMsgConfig(null);
    try {
      await api.patch(`/grupos/${params.id}`, {
        nombre: cfgNombre,
        capital_inicial: cfgCapital,
        activos_permitidos: cfgMercados,
        fecha_inicio: cfgFechaInicio,
        fecha_fin: cfgFechaFin,
        comision_porcentaje: parseFloat(cfgComision),
        limite_orden_valor: cfgLimiteOrden ? parseFloat(cfgLimiteOrden) : null,
      });
      setMsgConfig(t("maestro.detail.changesSaved"));
      setConfigOk(true);
      cargar();
    } catch (err) {
      setConfigOk(false);
      setMsgConfig(err instanceof ApiError ? err.message : t("maestro.detail.saveError"));
    } finally {
      setGuardando(false);
    }
  }

  async function ejecutarPausar(membershipId: string) {
    try {
      await api.post(`/grupos/${params.id}/memberships/${membershipId}/pausar`, {});
      cargar();
      cargarEvaluacion();
    } catch {
      // silent
    } finally {
      setPendingPause(null);
    }
  }

  async function ejecutarEliminar(membershipId: string) {
    try {
      await api.delete(`/grupos/${params.id}/memberships/${membershipId}`);
      cargar();
      cargarEvaluacion();
    } catch {
      // silent
    } finally {
      setPendingDelete(null);
    }
  }

  async function ejecutarRegen() {
    try {
      const actualizado = await api.post<GrupoDetalle>(`/grupos/${grupo!.id}/regenerar-codigo`, {});
      setGrupo(actualizado);
    } catch {
      // silent
    } finally {
      setPendingRegen(false);
    }
  }

  if (error) return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-7xl p-6">
        <ErrorState message={error} onRetry={() => { setError(null); cargar(); cargarEvaluacion(); }} />
      </div>
    </main>
  );
  if (!grupo) return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <p className="p-6 text-fg/40">{t("maestro.detail.loading")}</p>
    </main>
  );

  // Map membership id by alumno_id for pause button
  const membershipByAlumno: Record<string, Membership> = {};
  grupo.memberships.forEach((m) => { membershipByAlumno[m.alumno_id] = m; });

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <ConfirmModal
        open={!!pendingPause}
        title={pendingPause?.pausado ? t("admin.maestro.confirmResume") : t("admin.maestro.confirmPause")}
        message={pendingPause?.alumnoNombre ?? ""}
        danger={!pendingPause?.pausado}
        onConfirm={() => pendingPause && ejecutarPausar(pendingPause.membershipId)}
        onCancel={() => setPendingPause(null)}
      />
      <ConfirmModal
        open={!!pendingDelete}
        title={t("maestro.detail.confirmDelete")}
        message={pendingDelete?.alumnoNombre ?? ""}
        danger
        onConfirm={() => pendingDelete && ejecutarEliminar(pendingDelete.membershipId)}
        onCancel={() => setPendingDelete(null)}
      />
      <ConfirmModal
        open={pendingRegen}
        title={t("admin.maestro.confirmRegen")}
        message=""
        danger
        onConfirm={ejecutarRegen}
        onCancel={() => setPendingRegen(false)}
      />
      <div className="mx-auto max-w-7xl p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/maestro/grupos" className="font-mono text-[11px] uppercase tracking-widest text-fg/40 hover:text-fg">
              {t("maestro.detail.backToGroups")}
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-fg">{grupo.nombre}</h1>
            <p className="font-mono text-xs text-fg/50">
              {new Date(grupo.fecha_inicio).toLocaleDateString("es-MX")} →{" "}
              {new Date(grupo.fecha_fin).toLocaleDateString("es-MX")} · {t("maestro.detail.initialCapital")}:{" "}
              {fmt(grupo.capital_inicial)}
            </p>
            {grupo.codigo && (
              <div className="mt-2 flex items-center gap-2">
                <span className="font-mono text-[11px] text-fg/40 uppercase tracking-widest">{t("maestro.detail.code")}</span>
                <span className="font-mono text-lg font-bold tracking-[0.3em] text-accent">{grupo.codigo}</span>
                <button
                  type="button"
                  onClick={() => setPendingRegen(true)}
                  className="border border-fg/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg/50 hover:text-fg"
                >
                  {t("maestro.detail.regenerate")}
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {(["participantes", "config"] as const).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                className={`px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${tab === tabKey ? "bg-accent text-black" : "border border-fg/20 text-fg/60 hover:text-fg"}`}
              >
                {tabKey === "participantes" ? t("maestro.detail.tabBoard") : t("maestro.detail.tabConfig")}
              </button>
            ))}
          </div>
        </div>

        {/* Tab: Configuración */}
        {tab === "config" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <form onSubmit={guardarConfig} className="border border-fg/10 bg-panel p-6 space-y-5">
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-fg/40">{t("maestro.detail.conditions")}</h2>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-fg/50 mb-1">{t("maestro.detail.challengeName")}</label>
                <input
                  value={cfgNombre}
                  onChange={(e) => setCfgNombre(e.target.value)}
                  className="w-full border border-fg/20 bg-canvas px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-fg/50 mb-2">{t("maestro.detail.initialCapital")}</label>
                <div className="flex gap-2 flex-wrap">
                  {CAPITALES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCfgCapital(c)}
                      className={`px-3 py-1.5 font-mono text-xs transition-colors ${cfgCapital === c ? "bg-accent text-black" : "border border-fg/20 text-fg/60 hover:text-fg"}`}
                    >
                      ${c.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-fg/50 mb-2">{t("maestro.detail.allowedMarkets")}</label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-3">
                  {MERCADOS.map((m) => (
                    <div key={m.value}>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cfgMercados.includes(m.value)}
                          onChange={(e) => {
                            if (e.target.checked) setCfgMercados([...cfgMercados, m.value]);
                            else setCfgMercados(cfgMercados.filter((x) => x !== m.value));
                          }}
                          className="accent-accent"
                        />
                        <span className="font-mono text-xs text-fg/70">{t(m.labelKey)}</span>
                      </label>
                      <ActivosCategoria categoria={m.value} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-fg/50 mb-1">{t("maestro.detail.startDate")}</label>
                  <input
                    type="date"
                    value={cfgFechaInicio}
                    onChange={(e) => setCfgFechaInicio(e.target.value)}
                    className="w-full border border-fg/20 bg-canvas px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-fg/50 mb-1">{t("maestro.detail.endDate")}</label>
                  <input
                    type="date"
                    value={cfgFechaFin}
                    onChange={(e) => setCfgFechaFin(e.target.value)}
                    className="w-full border border-fg/20 bg-canvas px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-fg/50 mb-1">{t("maestro.detail.commissions")}</label>
                <select
                  value={cfgComision}
                  onChange={(e) => setCfgComision(e.target.value)}
                  className="w-full border border-fg/20 bg-canvas px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
                >
                  {COMISIONES.map((c) => (
                    <option key={c.value} value={c.value}>{c.labelKey ? t(c.labelKey) : c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-fg/50 mb-1">{t("maestro.detail.orderLimitUsd")}</label>
                <input
                  type="number"
                  value={cfgLimiteOrden}
                  onChange={(e) => setCfgLimiteOrden(e.target.value)}
                  placeholder={t("maestro.detail.noLimit")}
                  className="w-full border border-fg/20 bg-canvas px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
                />
              </div>

              {msgConfig && (
                <p className={`font-mono text-xs ${configOk ? "text-ganancia" : "text-perdida"}`}>
                  {msgConfig}
                </p>
              )}

              <button
                type="submit"
                disabled={guardando}
                className="w-full bg-accent py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-black disabled:opacity-50"
              >
                {guardando ? t("maestro.detail.saving") : t("maestro.detail.saveChanges")}
              </button>
            </form>

            {/* Invite panel */}
            <div className="border border-fg/10 bg-panel p-6">
              <h2 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-fg/40">{t("maestro.detail.addParticipant")}</h2>
              <form onSubmit={invitar} className="flex gap-2">
                <input
                  value={emailInvitar}
                  onChange={(e) => setEmailInvitar(e.target.value)}
                  placeholder={t("maestro.detail.emailPlaceholder")}
                  className="flex-1 border border-fg/20 bg-canvas px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent"
                />
                <button type="submit" className="bg-accent px-4 py-2 font-mono text-[11px] font-bold uppercase text-black">
                  {t("maestro.detail.add")}
                </button>
              </form>
              {mensajeInvitar && (
                <p className={`mt-2 font-mono text-xs ${inviteOk ? "text-ganancia" : "text-perdida"}`}>
                  {mensajeInvitar}
                </p>
              )}

              <div className="mt-6">
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">{t("maestro.detail.groupInfo")}</h3>
                <div className="space-y-1.5 font-mono text-xs text-fg/60">
                  <div className="flex justify-between"><span>{t("maestro.detail.initialCapital")}</span><span className="text-fg">{fmt(grupo.capital_inicial)}</span></div>
                  <div className="flex justify-between"><span>{t("maestro.detail.commission")}</span><span className="text-fg">{(Number(grupo.comision_porcentaje) * 100).toFixed(0)}%</span></div>
                  <div className="flex justify-between"><span>{t("maestro.detail.participants")}</span><span className="text-fg">{grupo.memberships.length}</span></div>
                  <div className="flex justify-between"><span>{t("maestro.detail.markets")}</span><span className="text-fg">{grupo.activos_permitidos.join(", ")}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Participantes (Tablero de evaluación) */}
        {tab === "participantes" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-fg/40">
                {t("maestro.detail.board")} — {evaluacion.length} {t("maestro.detail.participantsLabel")}
              </h2>
              <div className="flex gap-2">
                <button
                  disabled={exportando}
                  onClick={async () => {
                    setExportando(true);
                    try {
                      await api.download(`/grupos/${params.id}/evaluacion/exportar`, `tradex_ranking_${grupo.nombre}.csv`);
                    } catch {
                      toast(t("maestro.groups.exportError"), "error");
                    } finally {
                      setExportando(false);
                    }
                  }}
                  className="border border-accent px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-accent hover:bg-accent hover:text-black disabled:opacity-50"
                >
                  {exportando ? t("common.loading") : t("maestro.groups.exportCsv")}
                </button>
                <button
                  onClick={() => { cargar(); cargarEvaluacion(); }}
                  className="border border-fg/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-fg/50 hover:text-fg"
                >
                  {t("maestro.detail.refresh")}
                </button>
              </div>
            </div>

            {evaluacion.length === 0 ? (
              <div className="border border-fg/10 bg-panel p-8 text-center">
                <p className="font-mono text-sm text-fg/40">{t("maestro.detail.noParticipants")}</p>
                <button onClick={() => setTab("config")} className="mt-3 font-mono text-xs text-accent underline">
                  {t("maestro.detail.addParticipants")}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border border-fg/10 bg-panel text-sm">
                  <thead className="bg-fg/5">
                    <tr>
                      {["#", t("maestro.detail.colName"), t("maestro.detail.colPortfolioValue"), t("maestro.detail.colReturn"), t("maestro.detail.colCommissions"), t("maestro.detail.colOps"), t("maestro.detail.colAssets"), t("maestro.detail.colDays"), t("maestro.detail.colSchool"), t("maestro.detail.colCityState"), ""].map((h, i) => (
                        <th key={i} className="px-3 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-fg/40">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evaluacion.map((e) => {
                      const m = membershipByAlumno[e.alumno_id];
                      const rend = Number(e.rendimiento_porcentaje);
                      return (
                        <tr key={e.alumno_id} className={`border-t border-fg/5 ${e.pausado ? "opacity-50" : "hover:bg-fg/5"}`}>
                          <td className="px-3 py-3 font-mono text-xs font-bold text-fg/60">#{e.posicion}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-fg">{e.nombre}</span>
                              {e.pausado && (
                                <span className="bg-perdida/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-perdida">
                                  {t("maestro.detail.paused")}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono text-sm font-bold text-fg">{fmt(e.valor_total)}</td>
                          <td className={`px-3 py-3 font-mono text-sm font-semibold ${rend >= 0 ? "text-ganancia" : "text-perdida"}`}>
                            {rend >= 0 ? "+" : ""}{rend.toFixed(2)}%
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-fg/60">{fmt(e.comisiones_pagadas)}</td>
                          <td className="px-3 py-3 font-mono text-xs text-fg/60">{e.num_operaciones}</td>
                          <td className="px-3 py-3 font-mono text-[11px] text-fg/60">
                            {e.tickers.length > 0 ? e.tickers.join(", ") : "—"}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-fg/60">{e.dias_activo}d</td>
                          <td className="px-3 py-3 font-mono text-[11px] text-fg/60">{e.escuela ?? "—"}</td>
                          <td className="px-3 py-3 font-mono text-[11px] text-fg/60">
                            {[e.ciudad, e.estado].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="px-3 py-3">
                            {m && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setPendingPause({ membershipId: m.id, alumnoNombre: e.nombre, pausado: e.pausado })}
                                  className={`px-2 py-1 font-mono text-[10px] font-bold uppercase transition-colors ${e.pausado ? "bg-ganancia/10 text-ganancia hover:bg-ganancia/20" : "bg-perdida/10 text-perdida hover:bg-perdida/20"}`}
                                >
                                  {e.pausado ? t("maestro.detail.resume") : t("maestro.detail.pause")}
                                </button>
                                <button
                                  onClick={() => setPendingDelete({ membershipId: m.id, alumnoNombre: e.nombre })}
                                  className="border border-perdida/30 px-2 py-1 font-mono text-[10px] font-bold uppercase text-perdida transition-colors hover:bg-perdida/10"
                                >
                                  {t("maestro.detail.delete")}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Orders table */}
            {grupo.ordenes.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-fg/40">
                  {t("maestro.detail.lastOrders")}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border border-fg/10 bg-panel text-sm">
                    <thead className="bg-fg/5">
                      <tr>
                        {[t("maestro.detail.colStudent"), t("maestro.detail.colType"), t("maestro.detail.colTicker"), t("maestro.detail.colQuantity"), t("maestro.detail.colPrice"), t("maestro.detail.colCommissions"), t("maestro.detail.colDate"), ""].map((h, i) => (
                          <th key={i} className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-fg/40">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.ordenes.slice((pageOrdenes - 1) * ORDENES_PER_PAGE, pageOrdenes * ORDENES_PER_PAGE).map((o) => {
                        const alumno = evaluacion.find((e) => e.alumno_id === o.alumno_id);
                        const abierta = ordenExpandida === o.id;
                        return (
                          <>
                            <tr
                              key={o.id}
                              className="cursor-pointer border-t border-fg/5 hover:bg-fg/5"
                              onClick={() => setOrdenExpandida(abierta ? null : o.id)}
                            >
                              <td className="px-4 py-2.5 font-mono text-xs text-fg/70">{alumno?.nombre ?? "—"}</td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${o.tipo === "compra" ? "bg-ganancia/10 text-ganancia" : "bg-perdida/10 text-perdida"}`}>
                                  {o.tipo === "compra" ? t("maestro.detail.typeBuy") : t("maestro.detail.typeSell")}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 font-mono font-bold text-fg">{o.ticker}</td>
                              <td className="px-4 py-2.5 font-mono text-xs text-fg/70">{Number(o.cantidad).toFixed(4)}</td>
                              <td className="px-4 py-2.5 font-mono text-xs">{fmt(o.precio_ejecucion)}</td>
                              <td className="px-4 py-2.5 font-mono text-xs text-fg/60">{fmt(o.comision)}</td>
                              <td className="px-4 py-2.5 font-mono text-[10px] text-fg/40">
                                {new Date(o.timestamp).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td className="px-2 py-2.5 font-mono text-[10px] text-fg/30">{abierta ? "▲" : "▼"}</td>
                            </tr>
                            {abierta && (
                              <tr key={`${o.id}-fb`} className="border-t border-fg/5 bg-fg/2">
                                <td colSpan={8} className="px-4 pb-3">
                                  <ComentariosMaestro ordenId={o.id} esMaestro={true} />
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                  <Pagination
                    page={pageOrdenes}
                    totalPages={Math.max(1, Math.ceil(grupo.ordenes.length / ORDENES_PER_PAGE))}
                    onPage={setPageOrdenes}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
