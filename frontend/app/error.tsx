"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-sm border-2 border-perdida bg-panel p-8">
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-perdida">Error</p>
        <h2 className="mb-4 font-mono text-lg font-bold text-fg">Algo salió mal</h2>
        <p className="mb-6 text-sm text-fg/60">{error.message || "Ocurrió un error inesperado."}</p>
        <button
          onClick={reset}
          className="w-full bg-accent px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-black hover:opacity-90"
        >
          Intentar de nuevo
        </button>
      </div>
    </main>
  );
}
