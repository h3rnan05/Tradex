"use client";

import { useLanguage } from "@/lib/i18n";

interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: Props) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center gap-4 border border-perdida/30 bg-perdida/5 p-8 text-center">
      <span className="font-mono text-2xl text-perdida/60">⚠</span>
      <p className="font-mono text-sm text-perdida">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="border border-fg/20 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-fg/60 hover:border-fg/40 hover:text-fg transition-colors"
        >
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
