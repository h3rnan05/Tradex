"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
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
      setError(err instanceof ApiError ? err.message : t("login.error.noConnection"));
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
        <p className="mb-6 text-sm text-fg/40">{t("forgot.title")}</p>

        {enviado ? (
          <div className="rounded-none border border-ganancia/30 bg-ganancia/5 p-4">
            <p className="font-mono text-sm font-bold text-ganancia">{t("forgot.successTitle")}</p>
            <p className="mt-2 font-mono text-sm text-ganancia">{t("forgot.successDesc")}</p>
          </div>
        ) : (
          <form onSubmit={manejarSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-fg/60">{t("forgot.desc")}</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-fg/70">{t("forgot.email")}</label>
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
              {cargando ? t("forgot.sending") : t("forgot.submit")}
            </button>
          </form>
        )}

        <Link href="/login" className="mt-4 block text-center text-sm text-fg/40 hover:text-fg/70">
          {t("forgot.backToLogin")}
        </Link>
      </div>
    </main>
  );
}
