"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

const RUTAS_PUBLICAS = ["/", "/login", "/forgot-password", "/reset-password", "/verify-email"];

export default function BannerVerificacion() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [mostrar, setMostrar] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const sesion = obtenerSesion();
    const esPublica = RUTAS_PUBLICAS.includes(pathname ?? "");
    setMostrar(!!sesion && sesion.emailVerificado === false && !esPublica);
  }, [pathname]);

  if (!mostrar) return null;

  async function reenviar() {
    setEnviando(true);
    try {
      await api.post("/auth/resend-verification", {});
      setEnviado(true);
    } catch {
      // Si falla el reenvío no marcamos como enviado para evitar un falso positivo
      setEnviado(false);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 bg-accent/15 px-4 py-2 text-center">
      <span className="font-mono text-[11px] text-fg/70">{t("verify.bannerText")}</span>
      {enviado ? (
        <span className="font-mono text-[11px] font-bold text-ganancia">{t("verify.bannerSent")}</span>
      ) : (
        <button
          onClick={reenviar}
          disabled={enviando}
          className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent underline hover:opacity-80 disabled:opacity-50"
        >
          {enviando ? t("verify.verifying") : t("verify.bannerResend")}
        </button>
      )}
    </div>
  );
}
