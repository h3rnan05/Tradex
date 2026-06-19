"use client";

interface Props {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}

export default function Pagination({ page, totalPages, onPage }: Props) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center gap-1 font-mono text-[11px]">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 border border-fg/20 text-fg/60 hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ←
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
        .reduce<(number | "…")[]>((acc, p, i, arr) => {
          if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
          acc.push(p);
          return acc;
        }, [])
        .map((p, i, arr) =>
          p === "…" ? (
            <span key={`ellipsis-before-${arr[i + 1]}`} className="px-2 text-fg/30">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={`px-3 py-1.5 border transition-colors ${
                p === page
                  ? "border-accent bg-accent text-black font-bold"
                  : "border-fg/20 text-fg/60 hover:text-fg"
              }`}
            >
              {p}
            </button>
          )
        )}
      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1.5 border border-fg/20 text-fg/60 hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        →
      </button>
      <span className="ml-2 text-fg/30">{page} / {totalPages}</span>
    </div>
  );
}
