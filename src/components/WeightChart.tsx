"use client";

type Point = { date: string; weightKg: number | null };

export function WeightChart({ entries }: { entries: Point[] }) {
  const withWeight = entries
    .filter((e): e is { date: string; weightKg: number } => e.weightKg != null)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  if (withWeight.length < 2) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Wykres pojawi się po co najmniej dwóch wpisach z wagą.
      </p>
    );
  }

  const weights = withWeight.map((e) => e.weightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const pad = 0.3;
  const lo = min - pad;
  const hi = max + pad;
  const range = hi - lo || 1;

  const w = 320;
  const h = 120;
  const padX = 8;
  const padY = 8;

  const pts = withWeight.map((e, i) => {
    const x = padX + (i / (withWeight.length - 1)) * (w - padX * 2);
    const y = padY + (1 - (e.weightKg - lo) / range) * (h - padY * 2);
    return `${x},${y}`;
  });

  const polyline = pts.join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-32 w-full max-w-md" aria-hidden>
        <rect width={w} height={h} fill="transparent" />
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={polyline}
        />
        {withWeight.map((e, i) => {
          const x = padX + (i / (withWeight.length - 1)) * (w - padX * 2);
          const y = padY + (1 - (e.weightKg - lo) / range) * (h - padY * 2);
          return <circle key={e.date} cx={x} cy={y} r={3} fill="var(--accent)" />;
        })}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-[var(--muted)]">
        <span>{withWeight[0]?.date}</span>
        <span>{withWeight[withWeight.length - 1]?.date}</span>
      </div>
    </div>
  );
}
