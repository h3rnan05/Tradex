"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!token) setError("Token inválido o faltante.");
  }, [token]);

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setError(null);
    setCargando(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setListo(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo conectar con el servidor");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-sm rounded-none border-2 border-accent bg-panel p-8 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.15)]">
        <h1 className="mb-1 font-mono text-2xl font-bold uppercase tracking-widest text-fg">
          <span className="text-accent">■</span> Tradex
        </h1>
        <p className="mb-6 text-sm text-fg/40">Nueva contraseña</p>

        {listo ? (
          <div className="border border-ganancia/30 bg-ganancia/5 p-4">
            <p className="font-mono text-sm text-ganancia">
              ¡Contraseña actualizada! Redirigiendo al inicio de sesión…
            </p>
          </div>
        ) : (
          <form onSubmit={manejarSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-fg/70">Nueva contraseña</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-none border border-fg/20 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-fg/70">Confirmar contraseña</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                className="w-full rounded-none border border-fg/20 px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="text-sm text-perdida">{error}</p>}

            <button
              type="submit"
              disabled={cargando || !token}
              className="rounded-none bg-accent px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-black hover:opacity-90 disabled:opacity-50"
            >
              {cargando ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </form>
        )}

        <Link href="/login" className="mt-4 block text-center text-sm text-fg/40 hover:text-fg/70">
          Volver al inicio de sesión
        </Link>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-canvas"><p className="text-fg/40">Cargando…</p></main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
