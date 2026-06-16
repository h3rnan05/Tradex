import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold text-slate-900">Tradex</h1>
      <p className="max-w-md text-slate-600">
        Simulador educativo de inversión. Practica comprar y vender activos con capital
        virtual, en grupos guiados por tu maestro.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-slate-900 px-6 py-3 font-medium text-white hover:bg-slate-700"
      >
        Iniciar sesión
      </Link>
    </main>
  );
}
