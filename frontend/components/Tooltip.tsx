"use client";

import { useRef, useState } from "react";

export default function Tooltip({ texto }: { texto: string }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function show() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top: rect.top + window.scrollY - 8,
      left: rect.left + rect.width / 2 + window.scrollX,
    });
  }

  function hide() {
    setPos(null);
  }

  return (
    <span className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="ml-1 inline-flex size-3.5 items-center justify-center rounded-full border border-fg/30 font-mono text-[9px] font-bold leading-none text-fg/40 hover:border-accent hover:text-accent transition-colors"
        aria-label="Más información"
      >
        ?
      </button>
      {pos && (
        <span
          style={{ top: pos.top, left: pos.left, transform: "translate(-50%, -100%)" }}
          className="fixed z-[9999] w-56 rounded-none border border-fg/20 bg-panel px-3 py-2 text-left font-sans text-[11px] leading-relaxed text-fg/80 shadow-xl pointer-events-none"
        >
          {texto}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-fg/20" />
        </span>
      )}
    </span>
  );
}
