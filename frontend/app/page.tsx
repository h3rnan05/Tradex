import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas p-8 text-center">
      <span className="font-mono text-xs uppercase tracking-widest text-accent">Simulador educativo</span>
      <h1 className="font-mono text-5xl font-bold uppercase tracking-widest text-fg">
        <span className="text-accent">■</span> Tradex
      </h1>
      <p className="max-w-md text-fg/60">
        Practica comprar y vender activos con capital virtual, en grupos guiados por tu maestro.
      </p>
      <Link
        href="/login"
        className="rounded-none bg-accent px-6 py-3 font-mono text-sm font-bold uppercase tracking-wide text-black hover:opacity-90"
      >
        Iniciar sesión
      </Link>
    </main>
  );
}
