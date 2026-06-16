import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas p-8 text-center">
      <span className="font-mono text-xs uppercase tracking-widest text-term-amber">Simulador educativo</span>
      <h1 className="font-mono text-5xl font-bold uppercase tracking-widest text-fg drop-shadow-[0_0_14px_rgba(0,255,140,0.5)]">
        <span className="text-term-green">■</span> Tradex
      </h1>
      <p className="max-w-md text-fg/60">
        Practica comprar y vender activos con capital virtual, en grupos guiados por tu maestro.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-term-green px-6 py-3 font-mono text-sm font-bold uppercase tracking-wide text-term hover:opacity-90"
      >
        Iniciar sesión
      </Link>
    </main>
  );
}
