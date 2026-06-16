"use client";

import { useState } from "react";

export default function Tooltip({ texto }: { texto: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="ml-1 inline-flex size-3.5 items-center justify-center rounded-full border border-fg/30 font-mono text-[9px] font-bold leading-none text-fg/40 hover:border-accent hover:text-accent"
        aria-label="Más información"
      >
        ?
      </button>
      {visible && (
        <span className="absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-none border border-fg/15 bg-panel px-3 py-2 text-left font-sans text-[11px] leading-relaxed text-fg/80 shadow-lg">
          {texto}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-fg/15" />
        </span>
      )}
    </span>
  );
}
