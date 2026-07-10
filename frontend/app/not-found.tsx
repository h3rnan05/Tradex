"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas p-6 text-center">
      <p className="font-mono text-6xl font-bold text-accent">404</p>
      <p className="mt-3 font-mono text-lg font-semibold text-fg">{t("notFound.title")}</p>
      <p className="mt-2 text-sm text-fg/40">{t("notFound.desc")}</p>
      <Link
        href="/"
        className="mt-6 rounded-none bg-ink px-5 py-2 font-mono text-sm font-bold uppercase tracking-wide text-white hover:opacity-80"
      >
        {t("notFound.goHome")}
      </Link>
    </main>
  );
}
