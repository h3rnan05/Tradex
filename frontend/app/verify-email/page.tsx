"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { obtenerSesion, guardarSesion } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

function VerifyEmailContent() {
  const params = useSearchParams();
  const { t } = useLanguage();
  const token = params.get("token") ?? "";
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!token) {
      setEstado("error");
      setMensaje(t("verify.noToken"));
      return;
    }
    api.post("/auth/verify-email", { token })
      .then(() => {
        setEstado("ok");
        // Actualiza la sesión local si el usuario está logueado
        const sesion = obtenerSesion();
        if (sesion) guardarSesion({ ...sesion, emailVerificado: true });
      })
      .catch((err) => {
        setEstado("error");
        setMensaje(err instanceof ApiError ? err.message : t("verify.error"));
      });
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-sm rounded-none border-2 border-accent bg-panel p-8 text-center shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.15)]">
        <h1 className="mb-6 font-mono text-2xl font-bold uppercase tracking-widest text-fg">
          <span className="text-accent">■</span> Tradex
        </h1>

        {estado === "cargando" && (
          <p className="font-mono text-sm text-fg/40">{t("verify.verifying")}</p>
        )}
        {estado === "ok" && (
          <div className="border border-ganancia/30 bg-ganancia/5 p-4">
            <p className="font-mono text-sm font-bold text-ganancia">{t("verify.successTitle")}</p>
            <p className="mt-2 font-mono text-xs text-ganancia">{t("verify.successDesc")}</p>
          </div>
        )}
        {estado === "error" && (
          <div className="border border-perdida/30 bg-perdida/5 p-4">
            <p className="font-mono text-sm font-bold text-perdida">{t("verify.errorTitle")}</p>
            <p className="mt-2 font-mono text-xs text-perdida">{mensaje}</p>
          </div>
        )}

        <Link href="/login" className="mt-6 block text-center text-sm text-fg/40 hover:text-fg/70">
          {t("verify.goToLogin")}
        </Link>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-canvas"><p className="text-fg/40">…</p></main>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
