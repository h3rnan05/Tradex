import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas p-8 text-center">
      <span className="font-mono text-xs uppercase tracking-widest text-accent">Simulador educativo</span>
      <h1 className="font-mono text-4xl font-bold text-ink">Tradex</h1>
      <p className="max-w-md text-ink/60">
        Practica comprar y vender activos con capital virtual, en grupos guiados por tu maestro.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-ink px-6 py-3 font-mono text-sm font-medium uppercase tracking-wide text-white hover:bg-ink/80"
      >
        Iniciar sesión
      </Link>
    </main>
  );
}
