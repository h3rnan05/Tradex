"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RetoProvider, useRetoActivo } from "@/lib/retoContext";
import { useLanguage } from "@/lib/i18n";

function BannerReto() {
  const { reto } = useRetoActivo();
  const { t } = useLanguage();
  const pathname = usePathname();
  if (!reto) return null;
  // No mostrar el banner dentro de la propia página del reto.
  if (pathname?.startsWith("/alumno/retos/")) return null;

  const fin = new Date(reto.fecha_fin).getTime();
  const restanteMs = fin - Date.now();
  const horas = Math.max(0, Math.floor(restanteMs / 3_600_000));
  const dias = Math.floor(horas / 24);
  const restante = dias >= 1 ? `${dias}d ${horas % 24}h` : `${horas}h`;

  return (
    <Link
      href={`/alumno/retos/${reto.id}`}
      className="block border-b border-accent/40 bg-accent/10 px-4 py-2 text-center transition-colors hover:bg-accent/20"
    >
      <span className="font-mono text-[11px] uppercase tracking-widest text-accent">
        ● {t("retoMode.banner")}: {reto.nombre} · {t("retoMode.ends")} {restante} →
      </span>
    </Link>
  );
}

export default function AlumnoLayout({ children }: { children: React.ReactNode }) {
  return (
    <RetoProvider>
      <BannerReto />
      {children}
    </RetoProvider>
  );
}
