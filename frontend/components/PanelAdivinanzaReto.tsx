"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/primitives";

interface AdivinanzaOut {
  fase_actual: number;
  decada_guess: string | null;
  pais_guess: string | null;
  causa_guess: string | null;
  puntos: number | null;
  descripcion: string | null;
}

interface PreguntaFaseOut {
  fase_actual: number;
  opciones: string[];
  descripcion: string | null;
}

const FASE_LABELS = ["Década", "País de origen", "Causa"];

const CAUSA_LABELS: Record<string, string> = {
  moneda: "Moneda / Divisa",
  stock: "Acciones / Stock",
  indice: "Índice bursátil",
  bonos: "Bonos / Deuda",
  tasa_interes: "Tasa de interés",
  crypto: "Criptomonedas",
  banco: "Crisis bancaria",
  empresa_quiebra: "Quiebra empresarial",
  golpe_estado: "Golpe de estado",
  guerra: "Guerra",
  desastre_natural: "Desastre natural",
  elecciones: "Elecciones",
};

function opcionLabel(fase: number, op: string): string {
  if (fase === 2) return CAUSA_LABELS[op] ?? op;
  return op;
}

interface Props {
  retoId: string;
  progreso: number;
}

export default function PanelAdivinanzaReto({ retoId, progreso }: Props) {
  const [estado, setEstado] = useState<AdivinanzaOut | null>(null);
  const [pregunta, setPregunta] = useState<PreguntaFaseOut | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    const [e, p] = await Promise.all([
      api.get<AdivinanzaOut>(`/retos/${retoId}/adivinanza`),
      api.get<PreguntaFaseOut>(`/retos/${retoId}/adivinanza-pregunta`),
    ]);
    setEstado(e);
    setPregunta(p);
  }

  useEffect(() => {
    if (progreso > 0) cargar();
  }, [retoId, Math.floor(progreso / 25)]);

  async function elegir(valor: string) {
    if (!estado || !pregunta) return;
    setEnviando(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      if (pregunta.fase_actual === 0) body.decada = valor;
      else if (pregunta.fase_actual === 1) body.pais = valor;
      else if (pregunta.fase_actual === 2) body.causa = valor;
      const nuevo = await api.post<AdivinanzaOut>(`/retos/${retoId}/adivinar`, body);
      setEstado(nuevo);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setEnviando(false);
    }
  }

  if (!estado || estado.fase_actual === -1) return null;

  const fase = estado.fase_actual;
  const yaRespondioFaseActual =
    (fase === 0 && !!estado.decada_guess) ||
    (fase === 1 && !!estado.pais_guess) ||
    (fase === 2 && !!estado.causa_guess) ||
    fase >= 3;

  // Barra de progreso del juego (cuántas fases respondidas)
  const respuestas = [estado.decada_guess, estado.pais_guess, estado.causa_guess].filter(Boolean).length;

  return (
    <Card className="mb-4 border-2 border-accent/40 bg-panel">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-accent/60">
            ● Juego de adivinanza
          </p>
          <h3 className="font-mono text-[13px] font-bold uppercase tracking-wider text-fg">
            {fase < 3 ? `Fase ${fase + 1}/3 · ${FASE_LABELS[fase]}` : "Revelación histórica"}
          </h3>
        </div>
        {estado.puntos !== null && (
          <div className="text-right">
            <p className="font-mono text-[9px] uppercase text-fg/40">Boost final</p>
            <p className="font-mono text-2xl font-black text-accent">+{estado.puntos}%</p>
          </div>
        )}
      </div>

      {/* Progress pills */}
      <div className="mb-4 flex gap-1">
        {["Década", "País", "Causa"].map((label, i) => {
          const respuestas_ = [estado.decada_guess, estado.pais_guess, estado.causa_guess];
          const respondido = !!respuestas_[i];
          const activo = fase === i;
          return (
            <div
              key={label}
              className={`flex-1 border px-2 py-1 text-center font-mono text-[9px] uppercase tracking-wider transition-colors ${
                respondido
                  ? "border-accent bg-accent/10 text-accent"
                  : activo
                  ? "border-fg/40 text-fg/60"
                  : "border-fg/10 text-fg/20"
              }`}
            >
              {respondido ? "✓ " : ""}{label}
            </div>
          );
        })}
      </div>

      {/* Fase 0-2: selección */}
      {fase < 3 && !yaRespondioFaseActual && pregunta && pregunta.opciones.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {pregunta.opciones.map((op) => (
            <button
              key={op}
              disabled={enviando}
              onClick={() => elegir(op)}
              className="border border-fg/15 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-fg/70 transition-colors hover:border-accent hover:bg-accent/10 hover:text-accent disabled:opacity-40"
            >
              {opcionLabel(fase, op)}
            </button>
          ))}
        </div>
      )}

      {/* Ya respondió la fase actual */}
      {fase < 3 && yaRespondioFaseActual && (
        <div className="border border-accent/30 bg-accent/5 px-4 py-3">
          <p className="font-mono text-[11px] text-accent">
            ✓ Respuesta registrada. La siguiente fase se abre al{" "}
            {fase === 0 ? "25%" : fase === 1 ? "50%" : "75%"} del reto.
          </p>
        </div>
      )}

      {/* Fase 3: descripción revelada */}
      {fase >= 3 && estado.descripcion && (
        <div className="space-y-3">
          <div className="border border-fg/10 bg-canvas px-4 py-3">
            <p className="font-mono text-[10px] uppercase text-fg/40">Historia del escenario</p>
            <p className="mt-1 text-sm leading-relaxed text-fg/80">{estado.descripcion}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Década", guess: estado.decada_guess },
              { label: "País", guess: estado.pais_guess },
              { label: "Causa", guess: estado.causa_guess ? (CAUSA_LABELS[estado.causa_guess] ?? estado.causa_guess) : null },
            ].map(({ label, guess }) => (
              <div key={label} className="border border-fg/10 px-2 py-2">
                <p className="font-mono text-[9px] uppercase text-fg/40">{label}</p>
                <p className="mt-0.5 font-mono text-[11px] font-bold text-fg">{guess ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-2 font-mono text-[10px] text-perdida">{error}</p>}

      <p className="mt-3 font-mono text-[9px] text-fg/30">
        Adivina correctamente los 3 elementos para obtener un boost de +20% a tu portafolio final.
        2 correctas = +10% · 1 correcta = +5%
      </p>
    </Card>
  );
}
