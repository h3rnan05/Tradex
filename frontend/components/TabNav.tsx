"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type TabDef = { key: string; label: string };

export function TabNav({
  tabs,
  param = "tab",
  className = "",
}: {
  tabs: TabDef[];
  param?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(param) ?? tabs[0]?.key;

  function hrefFor(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(param, key);
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className={`inline-flex items-center gap-1 border border-fg/15 bg-panel p-1 ${className}`} role="tablist">
      {tabs.map((t) => {
        const active = t.key === current;
        return (
          <Link
            key={t.key}
            href={hrefFor(t.key)}
            scroll={false}
            role="tab"
            aria-selected={active}
            className={`px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              active ? "bg-accent text-black" : "text-fg/60 hover:text-fg"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
