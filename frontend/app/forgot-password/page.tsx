"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setEnviado(true);
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
        <p className="mb-6 text-sm text-fg/40">Recupera tu contraseña</p>

        {enviado ? (
          <div className="rounded-none border border-ganancia/30 bg-ganancia/5 p-4">
            <p className="font-mono text-sm text-ganancia">
              Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
            </p>
          </div>
        ) : (
          <form onSubmit={manejarSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-fg/70">Correo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-none border border-fg/20 px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="text-sm text-perdida">{error}</p>}

            <button
              type="submit"
              disabled={cargando}
              className="rounded-none bg-accent px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-black hover:opacity-90 disabled:opacity-50"
            >
              {cargando ? "Enviando..." : "Enviar enlace"}
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
