"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { api, ApiError } from "@/lib/api";

interface Escenario {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  tickers_sugeridos: string[];
}

interface Reto {
  id: string;
  nombre: string;
  escenario_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  capital_inicial: string;
}

interface Membership {
  id: string;
  alumno_id: string;
  capital_disponible: string;
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
  capital_inicial: string;
  max_alumnos: number | null;
  activos_permitidos: string[];
  limite_orden_valor: string | null;
  comision_porcentaje: string;
  fases_activo: { id: string; tipo_activo: string; fecha_activacion: string }[];
  memberships: Membership[];
  holdings: Holding[];
  ordenes: Orden[];
}

export default function DetalleGrupoPage() {
  const params = useParams<{ id: string }>();
  const [grupo, setGrupo] = useState<GrupoDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailInvitar, setEmailInvitar] = useState("");
  const [mensajeInvitar, setMensajeInvitar] = useState<string | null>(null);

  const [escenarios, setEscenarios] = useState<Escenario[]>([]);
  const [retos, setRetos] = useState<Reto[]>([]);
  const [mostrarFormReto, setMostrarFormReto] = useState(false);
  const [escenarioId, setEscenarioId] = useState("");
  const [nombreReto, setNombreReto] = useState("");
  const [duracionMinutos, setDuracionMinutos] = useState("60");
  const [capitalReto, setCapitalReto] = useState("10000");
  const [guardandoReto, setGuardandoReto] = useState(false);
  const [errorReto, setErrorReto] = useState<string | null>(null);

  async function cargar() {
    try {
      const data = await api.get<GrupoDetalle>(`/grupos/${params.id}`);
      setGrupo(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar el grupo");
    }
  }

  async function cargarRetos() {
    try {
      const data = await api.get<Reto[]>(`/grupos/${params.id}/retos`);
      setRetos(data);
    } catch {
      // silencioso, no es critico para el detalle del grupo
    }
  }

  useEffect(() => {
    cargar();
    cargarRetos();
    const interval = setInterval(cargar, 5000);
    return () => clearInterval(interval);
  }, [params.id]);

  useEffect(() => {
    api
      .get<Escenario[]>("/precios/escenarios")
      .then(setEscenarios)
      .catch(() => {});
  }, []);

  async function crearReto(e: React.FormEvent) {
    e.preventDefault();
    setGuardandoReto(true);
    setErrorReto(null);
    try {
      const ahora = new Date();
      const fin = new Date(ahora.getTime() + Number(duracionMinutos) * 60 * 1000);
      await api.post(`/grupos/${params.id}/retos`, {
        escenario_id: escenarioId,
        nombre: nombreReto,
        fecha_inicio: ahora.toISOString(),
        fecha_fin: fin.toISOString(),
        capital_inicial: capitalReto,
      });
      setNombreReto("");
      setEscenarioId("");
      setDuracionMinutos("60");
      setCapitalReto("10000");
      setMostrarFormReto(false);
      await cargarRetos();
    } catch (err) {
      setErrorReto(err instanceof ApiError ? err.message : "No se pudo crear el reto");
    } finally {
      setGuardandoReto(false);
    }
  }

  async function invitarAlumno(e: React.FormEvent) {
    e.preventDefault();
    setMensajeInvitar(null);
    try {
      await api.post(`/grupos/${params.id}/invitar`, { alumno_email: emailInvitar });
      setMensajeInvitar("Alumno agregado correctamente");
      setEmailInvitar("");
      await cargar();
    } catch (err) {
      setMensajeInvitar(err instanceof ApiError ? err.message : "No se pudo invitar al alumno");
    }
  }

  if (error) {
    return (
      <main className="min-h-screen bg-canvas">
        <Navbar />
        <p className="p-6 text-perdida">{error}</p>
      </main>
    );
  }

  if (!grupo) {
    return (
      <main className="min-h-screen bg-canvas">
        <Navbar />
        <p className="p-6 text-fg/40">Cargando...</p>
      </main>
    );
  }

  const holdingsPorAlumno = (alumnoId: string) =>
    grupo.holdings.filter((h) => h.alumno_id === alumnoId && Number(h.cantidad) > 0);

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="mb-1 text-2xl font-bold text-fg">{grupo.nombre}</h1>
        <p className="mb-1 text-sm text-fg/40">
          Capital inicial: ${Number(grupo.capital_inicial).toLocaleString("es-MX")}
          {" · "}
          Alumnos: {grupo.memberships.length}
          {grupo.max_alumnos !== null && ` / ${grupo.max_alumnos}`}
        </p>
        <p className="mb-6 text-sm text-fg/40">
          Activos permitidos: {grupo.activos_permitidos.join(", ")}
          {grupo.limite_orden_valor && (
            <>
              {" · "}
              Límite por orden: ${Number(grupo.limite_orden_valor).toLocaleString("es-MX")}
            </>
          )}
          {Number(grupo.comision_porcentaje) > 0 && (
            <>
              {" · "}
              Comisión: {(Number(grupo.comision_porcentaje) * 100).toFixed(2)}%
            </>
          )}
        </p>

        {grupo.fases_activo.length > 0 && (
          <p className="mb-6 text-sm text-fg/40">
            Activación progresiva:{" "}
            {grupo.fases_activo
              .map(
                (f) =>
                  `${f.tipo_activo} desde el ${new Date(f.fecha_activacion).toLocaleDateString("es-MX")}`
              )
              .join(" · ")}
          </p>
        )}

        {grupo.max_alumnos !== null && grupo.memberships.length >= grupo.max_alumnos ? (
          <p className="mb-8 text-sm text-perdida">
            Este grupo alcanzó el límite de {grupo.max_alumnos} alumnos.
          </p>
        ) : (
          <form onSubmit={invitarAlumno} className="mb-8 flex items-end gap-3 rounded-lg border border-fg/10 bg-panel p-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-fg/70">
                Correo del alumno a invitar
              </label>
              <input
                type="email"
                required
                value={emailInvitar}
                onChange={(e) => setEmailInvitar(e.target.value)}
                className="w-full rounded-md border border-fg/20 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/80"
            >
              Invitar
            </button>
          </form>
        )}
        {mensajeInvitar && <p className="mb-6 text-sm text-fg/60">{mensajeInvitar}</p>}

        <h2 className="mb-3 text-lg font-semibold text-fg">Alumnos</h2>
        <div className="mb-8 overflow-hidden rounded-lg border border-fg/10 bg-panel">
          <table className="w-full text-sm">
            <thead className="bg-fg/5 text-left text-fg/60">
              <tr>
                <th className="px-4 py-3">Alumno</th>
                <th className="px-4 py-3">Capital disponible</th>
                <th className="px-4 py-3">Posiciones abiertas</th>
              </tr>
            </thead>
            <tbody>
              {grupo.memberships.map((m) => (
                <tr key={m.id} className="border-t border-fg/5">
                  <td className="px-4 py-3 font-medium text-fg">{m.alumno_id}</td>
                  <td className="px-4 py-3">${Number(m.capital_disponible).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3">{holdingsPorAlumno(m.alumno_id).length}</td>
                </tr>
              ))}
              {grupo.memberships.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-fg/40">
                    Aún no hay alumnos en este grupo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h2 className="mb-3 text-lg font-semibold text-fg">Últimas operaciones</h2>
        <div className="overflow-hidden rounded-lg border border-fg/10 bg-panel">
          <table className="w-full text-sm">
            <thead className="bg-fg/5 text-left text-fg/60">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Ticker</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Comisión</th>
              </tr>
            </thead>
            <tbody>
              {grupo.ordenes.map((o) => (
                <tr key={o.id} className="border-t border-fg/5">
                  <td className="px-4 py-3">{new Date(o.timestamp).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3 font-medium">{o.ticker}</td>
                  <td className="px-4 py-3 capitalize">{o.tipo}</td>
                  <td className="px-4 py-3">{o.cantidad}</td>
                  <td className="px-4 py-3">${Number(o.precio_ejecucion).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3">${Number(o.comision).toLocaleString("es-MX")}</td>
                </tr>
              ))}
              {grupo.ordenes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-fg/40">
                    Todavía no hay operaciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">Retos cronometrados</h2>
          <button
            onClick={() => setMostrarFormReto(!mostrarFormReto)}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/80"
          >
            {mostrarFormReto ? "Cancelar" : "Lanzar reto"}
          </button>
        </div>

        {mostrarFormReto && (
          <form
            onSubmit={crearReto}
            className="mb-6 flex flex-col gap-4 rounded-lg border border-fg/10 bg-panel p-6"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-fg/70">Nombre del reto</label>
              <input
                required
                value={nombreReto}
                onChange={(e) => setNombreReto(e.target.value)}
                className="w-full rounded-md border border-fg/20 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-fg/70">Escenario histórico</label>
              <select
                required
                value={escenarioId}
                onChange={(e) => setEscenarioId(e.target.value)}
                className="w-full rounded-md border border-fg/20 px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Selecciona un escenario
                </option>
                {escenarios.map((esc) => (
                  <option key={esc.id} value={esc.id}>
                    {esc.nombre} ({esc.fecha_inicio} a {esc.fecha_fin})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-fg/70">Duración (minutos)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={duracionMinutos}
                  onChange={(e) => setDuracionMinutos(e.target.value)}
                  className="w-full rounded-md border border-fg/20 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-fg/70">Capital inicial del reto</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={capitalReto}
                  onChange={(e) => setCapitalReto(e.target.value)}
                  className="w-full rounded-md border border-fg/20 px-3 py-2 text-sm"
                />
              </div>
            </div>
            {errorReto && <p className="text-sm text-perdida">{errorReto}</p>}
            <button
              type="submit"
              disabled={guardandoReto}
              className="self-start rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/80 disabled:opacity-50"
            >
              {guardandoReto ? "Lanzando..." : "Lanzar reto"}
            </button>
          </form>
        )}

        <div className="overflow-hidden rounded-lg border border-fg/10 bg-panel">
          <table className="w-full text-sm">
            <thead className="bg-fg/5 text-left text-fg/60">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Escenario</th>
                <th className="px-4 py-3">Inicio</th>
                <th className="px-4 py-3">Fin</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {retos.map((r) => (
                <tr key={r.id} className="border-t border-fg/5">
                  <td className="px-4 py-3 font-medium text-fg">{r.nombre}</td>
                  <td className="px-4 py-3">{r.escenario_id}</td>
                  <td className="px-4 py-3">{new Date(r.fecha_inicio).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3">{new Date(r.fecha_fin).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/maestro/retos/${r.id}`} className="text-fg/70 underline hover:text-fg">
                      Ver ranking
                    </Link>
                  </td>
                </tr>
              ))}
              {retos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-fg/40">
                    Todavía no se ha lanzado ningún reto en este grupo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
