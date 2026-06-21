"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface ActivoItem {
  ticker: string;
  nombre: string;
}

type Categorias = Record<string, ActivoItem[]>;

// Cache compartido a nivel de módulo para no pedir la lista en cada render.
let cache: Categorias | null = null;
let pendiente: Promise<Categorias> | null = null;

function cargarCategorias(): Promise<Categorias> {
  if (cache) return Promise.resolve(cache);
  if (!pendiente) {
    pendiente = api
      .get<Categorias>("/precios/categorias")
      .then((data) => {
        cache = data;
        return data;
      })
      .catch(() => ({}) as Categorias);
  }
  return pendiente;
}

/**
 * Lista desplegable de los activos que incluye una categoría de mercado
 * (acciones, bolsa_mx, ETFs/índices, etc.). Solo nombres, sin precios.
 */
export default function ActivosCategoria({ categoria }: { categoria: string }) {
  const { t } = useLanguage();
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<ActivoItem[] | null>(null);

  useEffect(() => {
    if (abierto && items === null) {
      cargarCategorias().then((data) => setItems(data[categoria] ?? []));
    }
  }, [abierto, items, categoria]);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center gap-1 px-1 font-mono text-[10px] uppercase tracking-wider text-fg/40 hover:text-accent"
      >
        <span>{abierto ? "▾" : "▸"}</span>
        {abierto ? t("maestro.groups.hideAssets") : t("maestro.groups.viewAssets")}
      </button>
      {abierto && (
        <ul className="mt-1 max-h-44 overflow-y-auto border border-fg/10 bg-canvas">
          {items === null ? (
            <li className="px-2 py-1.5 font-mono text-[10px] italic text-fg/40">…</li>
          ) : items.length === 0 ? (
            <li className="px-2 py-1.5 font-mono text-[10px] italic text-fg/40">—</li>
          ) : (
            items.map((a) => (
              <li
                key={a.ticker}
                className="flex items-center justify-between border-b border-fg/5 px-2 py-1 last:border-0"
              >
                <span className="text-xs text-fg/80">{a.nombre}</span>
                <span className="font-mono text-[10px] text-fg/40">
                  {a.ticker.replace("-USD", "").replace("=X", "").replace(".MX", "")}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
