"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Comentario {
  id: string;
  texto: string;
  maestro_id: string;
  created_at: string;
}

interface Props {
  ordenId: string;
  esMaestro: boolean;
}

export default function ComentariosMaestro({ ordenId, esMaestro }: Props) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.get<Comentario[]>(`/comentarios/orden/${ordenId}`)
      .then(setComentarios)
      .catch(() => {});
  }, [ordenId]);

  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      const nuevo = await api.post<Comentario>(`/comentarios/orden/${ordenId}`, { texto });
      setComentarios(prev => [...prev, nuevo!]);
      setTexto("");
    } catch {
      // ignore
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar(id: string) {
    await api.delete(`/comentarios/${id}`);
    setComentarios(prev => prev.filter(c => c.id !== id));
  }

  if (comentarios.length === 0 && !esMaestro) return null;

  return (
    <div className="mt-2 border-t border-fg/5 pt-2">
      {comentarios.map(c => (
        <div key={c.id} className="flex items-start gap-2 py-1.5">
          <span className="mt-0.5 shrink-0 text-accent font-mono text-[10px]">✎</span>
          <div className="flex-1">
            <p className="font-mono text-[11px] text-fg/70 leading-relaxed">{c.texto}</p>
            <p className="font-mono text-[9px] text-fg/30 mt-0.5">
              {new Date(c.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          {esMaestro && (
            <button onClick={() => eliminar(c.id)} className="font-mono text-[10px] text-fg/30 hover:text-perdida">✕</button>
          )}
        </div>
      ))}

      {esMaestro && (
        <div className="mt-2 flex gap-2">
          <input
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => e.key === "Enter" && enviar()}
            placeholder="Escribe retroalimentación..."
            className="flex-1 border border-fg/10 bg-canvas px-3 py-1.5 font-mono text-[11px] text-fg placeholder-fg/30 focus:border-accent focus:outline-none"
          />
          <button
            onClick={enviar}
            disabled={enviando || !texto.trim()}
            className="border border-accent px-3 py-1.5 font-mono text-[11px] text-accent disabled:opacity-40 hover:bg-accent hover:text-white"
          >
            {enviando ? "..." : "Enviar"}
          </button>
        </div>
      )}
    </div>
  );
}
