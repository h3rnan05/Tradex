"use client";

import { useLanguage } from "@/lib/i18n";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="mt-16 border-t border-fg/10 bg-canvas">
      <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block size-1.5 bg-accent" aria-hidden />
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent">Tradex</span>
        </div>
        <p className="font-mono text-[10px] text-fg/30 text-center">
          © {new Date().getFullYear()} Tradex. {t("footer.rights")} Obra registrada ante INDAUTOR.
        </p>
        <p className="font-mono text-[10px] text-fg/20">
          {t("footer.disclaimer")}
        </p>
      </div>
    </footer>
  );
}
