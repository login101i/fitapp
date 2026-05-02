"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  points: number;
  maxPoints: number;
  onClose: () => void;
};

export function ScoreCelebration({ open, points, maxPoints, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => onClose(), 4200);
    return () => window.clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  const perfect = points >= maxPoints;

  return (
    <div
      className="celebration-root fixed inset-0 z-[100] flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Gratulacje"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        aria-label="Zamknij"
        onClick={onClose}
      />
      <div
        className={`celebration-card relative max-w-sm rounded-2xl border px-6 py-8 text-center shadow-2xl ${
          perfect
            ? "border-amber-400/50 bg-gradient-to-b from-amber-950/95 to-zinc-950/95"
            : "border-white/20 bg-[var(--surface)]/95"
        }`}
      >
        {perfect && (
          <div className="celebration-stars mb-4 flex justify-center gap-2 text-3xl" aria-hidden>
            {"★★★★★".split("").map((s, i) => (
              <span
                key={i}
                className="celebration-star inline-block text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                {s}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          {perfect ? "Poziom mistrzowski" : "Zapisano"}
        </p>
        <p className="mt-2 text-2xl font-bold text-white">
          {points}/{maxPoints} pkt
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          {perfect
            ? "Pełna dzienna punktacja — wszystkie plusy, bez kar za noc i alkohol. Tak trzymaj!"
            : "Każdy dzień buduje Twój tydzień. Cel: jak najwięcej plusów."}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white hover:bg-blue-600"
        >
          Zamknij
        </button>
      </div>
    </div>
  );
}
