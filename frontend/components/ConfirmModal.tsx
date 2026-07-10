"use client";

import { useLanguage } from "@/lib/i18n";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ open, title, message, confirmLabel, danger = false, onConfirm, onCancel }: Props) {
  const { t } = useLanguage();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm border border-fg/20 bg-canvas p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 font-mono text-sm font-bold uppercase tracking-widest text-fg">{title}</h2>
        <p className="mb-6 font-mono text-xs text-fg/60">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="border border-fg/20 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-fg/60 hover:text-fg transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-opacity hover:opacity-90 ${danger ? "bg-perdida text-white" : "bg-accent text-black"}`}
          >
            {confirmLabel ?? t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
