"use client";

import { useEffect, type SVGProps } from "react";
import {
  DAY_MAX_POSITIVE,
  DAY_MIN_NET,
  PENALTY_EACH,
  WEEK_MAX_POINTS,
  dayScore,
  weekPercentOfMax,
  weekPointsEarned,
  weekTier,
  type ScoredDay,
} from "@/lib/day-score";

export type ManageDayRow = {
  id: string;
  date: string;
  weightKg: number | null;
  drankLotsOfWater: boolean;
  mealsCorrect: boolean;
  trained: boolean;
  walked: boolean;
  limitedSugar: boolean;
  ateLateNight: boolean;
  drankAlcohol: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  entries: ManageDayRow[];
  scoredDays: ScoredDay[];
  onEditDate: (dateISO: string) => void;
  onRefresh: () => void | Promise<void>;
};

function GearIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V15a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
      />
    </svg>
  );
}

export function EntriesGearButton({
  onClick,
  expanded,
}: {
  onClick: () => void;
  expanded: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls="entries-manage-panel"
      className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-white/20 bg-black/35 text-white shadow-lg backdrop-blur-md transition hover:bg-black/50 active:scale-[0.98] sm:size-10"
      title="Wpisy — edycja i usuwanie"
    >
      <GearIcon className="size-6 sm:size-5" />
    </button>
  );
}

export function EntriesManageDrawer({
  open,
  onClose,
  entries,
  scoredDays,
  onEditDate,
  onRefresh,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleDelete(dateISO: string) {
    const ok = window.confirm(`Usunąć wpis z dnia ${dateISO}? Tej operacji nie cofniesz.`);
    if (!ok) return;
    try {
      const res = await fetch("/api/daily", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateISO }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? "Nie udało się usunąć.");
        return;
      }
      await onRefresh();
    } catch {
      window.alert("Błąd sieci.");
    }
  }

  function handleEdit(dateISO: string) {
    onEditDate(dateISO);
    onClose();
  }

  if (!open) return null;

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const weekEarned = weekPointsEarned(scoredDays);
  const weekPct = weekPercentOfMax(scoredDays);
  const tier = weekTier(weekPct);

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Zamknij panel"
        onClick={onClose}
      />
      <aside
        id="entries-manage-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entries-panel-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-white/15 bg-[#0f141c]/95 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <h2 id="entries-panel-title" className="text-lg font-semibold">
            Twoje wpisy
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-[var(--muted)] hover:bg-white/10 hover:text-white"
          >
            Zamknij
          </button>
        </div>

        <div className="border-b border-white/10 px-4 py-3 text-xs leading-relaxed text-[var(--muted)]">
          <p className="font-semibold text-[var(--text)]">Punktacja</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <strong className="text-[var(--text)]">+1</strong> za każdy plus: dużo wody, posiłki OK, trening,
              spacer, ograniczałem cukier — <strong className="text-[var(--text)]">max +{DAY_MAX_POSITIVE} dziennie</strong>.
            </li>
            <li>
              <strong className="text-[var(--text)]">−{PENALTY_EACH}</strong> za zaznaczenie „jedzenie na noc” oraz{" "}
              <strong className="text-[var(--text)]">−{PENALTY_EACH}</strong> za alkohol (łącznie do −2).
            </li>
            <li>
              Wynik dnia może być od <strong className="text-[var(--text)]">{DAY_MIN_NET}</strong> do{" "}
              <strong className="text-[var(--text)]">+{DAY_MAX_POSITIVE}</strong> pkt.
            </li>
            <li>
              <strong className="text-[var(--text)]">Tydzień (pon–niedz.):</strong> sumujesz swoje dni; brak wpisu =
              0 pkt za ten dzień. <strong className="text-[var(--text)]">Max {WEEK_MAX_POINTS} pkt</strong> (7 ×{" "}
              {DAY_MAX_POSITIVE}).
            </li>
            <li>
              Ten tydzień: <strong className="text-[var(--text)]">{weekEarned}</strong> / {WEEK_MAX_POINTS} (
              {weekPct.toFixed(0)}%) — <strong className="text-[var(--text)]">{tier.label}</strong>
            </li>
          </ul>
          <p className="mt-3 border-t border-white/10 pt-3">
            <strong className="text-[var(--text)]">Ocena tygodnia:</strong> od{" "}
            <strong className="text-amber-200">95%</strong> — Super level;{" "}
            <strong className="text-emerald-200">85–95%</strong> — Świetnie;{" "}
            <strong className="text-sky-200">75–85%</strong> — OK; <strong className="text-red-200">&lt;75%</strong>{" "}
            — Słabo.
          </p>
          <p className="mt-2">
            <strong className="text-[var(--text)]">Edytuj</strong> — ustawia datę w formularzu na górze strony.
            <strong className="text-[var(--text)]"> Usuń</strong> — kasuje dzień z bazy.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {sorted.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-[var(--muted)]">Brak zapisanych dni.</p>
          ) : (
            <ul className="space-y-2">
              {sorted.map((row) => {
                const d = row.date.slice(0, 10);
                const pts = dayScore({
                  drankLotsOfWater: row.drankLotsOfWater,
                  mealsCorrect: row.mealsCorrect,
                  trained: Boolean(row.trained),
                  walked: Boolean(row.walked),
                  limitedSugar: Boolean(row.limitedSugar),
                  ateLateNight: row.ateLateNight,
                  drankAlcohol: row.drankAlcohol,
                });
                return (
                  <li
                    key={row.id}
                    className="rounded-xl border border-white/10 bg-black/25 px-3 py-3 backdrop-blur-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-white">{d}</p>
                        <p className="text-xs text-[var(--muted)]">
                          <span className={pts < 0 ? "text-red-300" : pts >= DAY_MAX_POSITIVE ? "text-amber-200" : ""}>
                            {pts > 0 ? "+" : ""}
                            {pts} pkt
                          </span>
                          {row.weightKg != null ? ` · ${row.weightKg} kg` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(d)}
                          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600"
                        >
                          Edytuj
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(d)}
                          className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-950/70"
                        >
                          Usuń
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
