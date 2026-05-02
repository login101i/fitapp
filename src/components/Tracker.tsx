"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { WeightChart } from "./WeightChart";
import { ScoreCelebration } from "./ScoreCelebration";
import { EntriesGearButton, EntriesManageDrawer } from "./EntriesManageDrawer";
import { bmiKgM2, formatBmi } from "@/lib/bmi";
import {
  DAY_MAX_POSITIVE,
  DAY_MIN_NET,
  WEEK_MAX_POINTS,
  dayScore,
  isPerfectDay,
  perfectStreak,
  totalPoints,
  weekPercentOfMax,
  weekPointsEarned,
  weekTier,
  type ScoredDay,
  type WeekTierId,
} from "@/lib/day-score";

type Profile = {
  id: string;
  heightCm: number;
  baselineWeightKg: number | null;
};

type DailyRow = {
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

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function Tracker() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<DailyRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [celebrateOpen, setCelebrateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const [date, setDate] = useState(todayISO);
  const [weightKg, setWeightKg] = useState("");
  const [drankLotsOfWater, setDrankLotsOfWater] = useState(false);
  const [mealsCorrect, setMealsCorrect] = useState(false);
  const [trained, setTrained] = useState(false);
  const [walked, setWalked] = useState(false);
  const [limitedSugar, setLimitedSugar] = useState(false);
  const [ateLateNight, setAteLateNight] = useState(false);
  const [drankAlcohol, setDrankAlcohol] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [pr, list] = await Promise.all([
        fetch("/api/profile").then((r) => r.json()),
        fetch("/api/daily?days=365").then((r) => r.json()),
      ]);
      if (pr.error) {
        setLoadError(pr.error);
        return;
      }
      setProfile(pr);
      if (Array.isArray(list)) {
        setEntries(list);
      } else if (list.error) {
        setLoadError(list.error);
      }
    } catch {
      setLoadError("Brak połączenia z API.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const entryForDate = useMemo(() => {
    const day = date.slice(0, 10);
    return entries.find((e) => e.date.slice(0, 10) === day);
  }, [entries, date]);

  useEffect(() => {
    const e = entryForDate;
    if (!e) {
      setWeightKg("");
      setDrankLotsOfWater(false);
      setMealsCorrect(false);
      setTrained(false);
      setWalked(false);
      setLimitedSugar(false);
      setAteLateNight(false);
      setDrankAlcohol(false);
      return;
    }
    setWeightKg(e.weightKg != null ? String(e.weightKg) : "");
    setDrankLotsOfWater(e.drankLotsOfWater);
    setMealsCorrect(e.mealsCorrect);
    setTrained(Boolean(e.trained));
    setWalked(Boolean(e.walked));
    setLimitedSugar(Boolean(e.limitedSugar));
    setAteLateNight(e.ateLateNight);
    setDrankAlcohol(e.drankAlcohol);
  }, [entryForDate, date]);

  const latestWeight = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    for (const e of sorted) {
      if (e.weightKg != null) return e.weightKg;
    }
    return profile?.baselineWeightKg ?? null;
  }, [entries, profile]);

  const bmi =
    profile && latestWeight != null ? bmiKgM2(latestWeight, profile.heightCm) : null;

  const previewScore = dayScore({
    drankLotsOfWater,
    mealsCorrect,
    trained,
    walked,
    limitedSugar,
    ateLateNight,
    drankAlcohol,
  });

  const scoredEntries: ScoredDay[] = useMemo(() => {
    return entries.map((row) => ({
      date: row.date,
      drankLotsOfWater: row.drankLotsOfWater,
      mealsCorrect: row.mealsCorrect,
      trained: Boolean(row.trained),
      walked: Boolean(row.walked),
      limitedSugar: Boolean(row.limitedSugar),
      ateLateNight: row.ateLateNight,
      drankAlcohol: row.drankAlcohol,
    }));
  }, [entries]);

  const sumPoints = totalPoints(scoredEntries);
  const streakPerfect = perfectStreak(scoredEntries, date);
  const weekEarned = weekPointsEarned(scoredEntries);
  const weekPct = weekPercentOfMax(scoredEntries);
  const weekTierInfo = weekTier(weekPct);

  const tierChipClass = (id: WeekTierId): string => {
    if (id === "super_level") return "border-amber-400/45 bg-amber-950/45 text-amber-50";
    if (id === "great") return "border-emerald-500/40 bg-emerald-950/35 text-emerald-50";
    if (id === "ok") return "border-sky-500/35 bg-sky-950/30 text-sky-50";
    return "border-red-500/35 bg-red-950/35 text-red-50";
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    const w = weightKg.trim() === "" ? null : Number(weightKg.replace(",", "."));
    if (w != null && (Number.isNaN(w) || w < 30 || w > 400)) {
      setSaveMsg("Podaj sensowną wagę w kg lub zostaw puste.");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          weightKg: w,
          drankLotsOfWater,
          mealsCorrect,
          trained,
          walked,
          limitedSugar,
          ateLateNight,
          drankAlcohol,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMsg(data.error ?? "Błąd zapisu.");
        setSaving(false);
        return;
      }
      const saved = data as DailyRow;
      const savedInput: ScoredDay = {
        date: saved.date,
        drankLotsOfWater: saved.drankLotsOfWater,
        mealsCorrect: saved.mealsCorrect,
        trained: Boolean(saved.trained),
        walked: Boolean(saved.walked),
        limitedSugar: Boolean(saved.limitedSugar),
        ateLateNight: saved.ateLateNight,
        drankAlcohol: saved.drankAlcohol,
      };
      const pts = dayScore(savedInput);
      setSaveMsg(`Zapisano · ${pts > 0 ? "+" : ""}${pts} pkt`);
      if (isPerfectDay(savedInput)) setCelebrateOpen(true);
      await load();
    } catch {
      setSaveMsg("Błąd sieci.");
    }
    setSaving(false);
  }

  const chartPoints = entries.map((e) => ({
    date: e.date.slice(0, 10),
    weightKg: e.weightKg,
  }));

  const card =
    "rounded-xl border border-white/15 bg-[var(--surface)]/90 shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-[var(--surface)]/75";

  return (
    <div className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-6 md:max-w-4xl">
      <ScoreCelebration
        open={celebrateOpen}
        points={DAY_MAX_POSITIVE}
        maxPoints={DAY_MAX_POSITIVE}
        onClose={() => setCelebrateOpen(false)}
      />

      <EntriesManageDrawer
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        entries={entries}
        scoredDays={scoredEntries}
        onEditDate={(iso) => {
          setDate(iso);
          setSaveMsg(null);
        }}
        onRefresh={load}
      />

      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight drop-shadow md:text-2xl">FitApp</h1>
          <p className="text-[11px] text-[var(--muted)] md:text-xs">Wpis na górze · koło zębate = lista i punktacja</p>
        </div>
        <EntriesGearButton expanded={manageOpen} onClick={() => setManageOpen((v) => !v)} />
      </header>

      {loadError && (
        <div
          className={`mb-3 ${card} border-amber-500/35 bg-amber-950/55 px-3 py-2.5 text-xs text-amber-50 sm:text-sm`}
          role="alert"
        >
          {loadError}{" "}
          <span className="text-[var(--muted)]">
            Utwórz projekt na neon.tech, skopiuj connection string do pliku{" "}
            <code className="rounded bg-black/30 px-1">.env</code> jako{" "}
            <code className="rounded bg-black/30 px-1">DATABASE_URL</code>, potem{" "}
            <code className="rounded bg-black/30 px-1">npx prisma db push</code>.
          </span>
        </div>
      )}

      <section className={`mb-3 p-3 sm:p-4 ${card}`}>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-base font-semibold">Wpis dnia</h2>
          <p className="text-[11px] text-[var(--muted)]">
            Podgląd:{" "}
            <strong className={previewScore < 0 ? "text-red-300" : "text-amber-200"}>
              {previewScore > 0 ? "+" : ""}
              {previewScore} pkt
            </strong>{" "}
            (max +{DAY_MAX_POSITIVE}, min {DAY_MIN_NET})
          </p>
        </div>
        <p className="mb-3 text-[11px] leading-snug text-[var(--muted)]">
          Plusy: woda, posiłki, trening, spacer, ograniczałem cukier. Minusy: noc (−1), alkohol (−1).
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <label className="block text-xs">
              <span className="text-[var(--muted)]">Data</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-0.5 min-h-10 w-full rounded-lg border border-[var(--border)] bg-black/35 px-2 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block text-xs">
              <span className="text-[var(--muted)]">Waga (kg)</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="—"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="mt-0.5 min-h-10 w-full rounded-lg border border-[var(--border)] bg-black/35 px-2 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          <fieldset className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-1.5">
            <legend className="col-span-full mb-0.5 text-[11px] text-[var(--muted)]">Nawyki</legend>
            <label className="flex cursor-pointer items-start gap-2 text-xs leading-snug">
              <input
                type="checkbox"
                checked={drankLotsOfWater}
                onChange={(e) => setDrankLotsOfWater(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-[var(--border)] bg-black/35 accent-[var(--accent)]"
              />
              Piłem dużo wody
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-xs leading-snug">
              <input
                type="checkbox"
                checked={mealsCorrect}
                onChange={(e) => setMealsCorrect(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-[var(--border)] bg-black/35 accent-[var(--accent)]"
              />
              Posiłki OK
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-xs leading-snug">
              <input
                type="checkbox"
                checked={trained}
                onChange={(e) => setTrained(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-[var(--border)] bg-black/35 accent-[var(--accent)]"
              />
              Trening
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-xs leading-snug">
              <input
                type="checkbox"
                checked={walked}
                onChange={(e) => setWalked(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-[var(--border)] bg-black/35 accent-[var(--accent)]"
              />
              Spacer
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-xs leading-snug">
              <input
                type="checkbox"
                checked={limitedSugar}
                onChange={(e) => setLimitedSugar(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-[var(--border)] bg-black/35 accent-[var(--accent)]"
              />
              Ograniczałem cukier (+1)
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-xs leading-snug sm:col-span-2">
              <input
                type="checkbox"
                checked={ateLateNight}
                onChange={(e) => setAteLateNight(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-[var(--border)] bg-black/35 accent-red-500"
              />
              Jadłem na noc <span className="text-red-300/90">(−1 pkt)</span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-xs leading-snug sm:col-span-2">
              <input
                type="checkbox"
                checked={drankAlcohol}
                onChange={(e) => setDrankAlcohol(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-[var(--border)] bg-black/35 accent-red-500"
              />
              Piłem alkohol <span className="text-red-300/90">(−1 pkt)</span>
            </label>
          </fieldset>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="min-h-10 min-w-[7.5rem] touch-manipulation rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "…" : "Zapisz"}
            </button>
            {saveMsg && <span className="text-xs text-[var(--muted)]">{saveMsg}</span>}
          </div>
        </form>
      </section>

      <div className="mb-3 flex flex-wrap gap-1.5 text-[10px] sm:text-[11px]">
        <span className="rounded-full border border-white/20 bg-black/30 px-2 py-1 font-medium backdrop-blur-sm">
          Łącznie: <strong className="text-white">{sumPoints}</strong> pkt
        </span>
        <span className="rounded-full border border-white/20 bg-black/30 px-2 py-1 backdrop-blur-sm">
          Seria max dni: <strong className="text-white">{streakPerfect}</strong>
        </span>
        <span className="rounded-full border border-white/20 bg-black/30 px-2 py-1 backdrop-blur-sm">
          Tydzień: <strong className="text-white">{weekEarned}</strong> / {WEEK_MAX_POINTS} (
          {weekPct.toFixed(0)}%)
        </span>
        <span
          className={`rounded-full border px-2 py-1 font-medium backdrop-blur-sm ${tierChipClass(weekTierInfo.id)}`}
        >
          {weekTierInfo.label}
        </span>
      </div>

      {profile && (
        <section className={`mb-3 grid grid-cols-3 gap-2 p-3 text-xs sm:text-sm ${card}`}>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Wzrost</p>
            <p className="font-semibold">{profile.heightCm} cm</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Waga</p>
            <p className="font-semibold leading-tight">
              {latestWeight != null ? `${latestWeight} kg` : "—"}
              {profile.baselineWeightKg != null && (
                <span className="block text-[10px] font-normal text-[var(--muted)]">
                  start {profile.baselineWeightKg}
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">BMI</p>
            <p className="font-semibold">{bmi != null ? formatBmi(bmi) : "—"}</p>
          </div>
        </section>
      )}

      <section className={`mb-4 p-3 sm:p-4 ${card}`}>
        <h2 className="mb-3 text-base font-medium">Trend wagi</h2>
        <WeightChart entries={chartPoints} />
      </section>

      <section className={`p-3 sm:p-4 ${card}`}>
        <h2 className="mb-3 text-base font-medium">Ostatnie wpisy</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                <th className="pb-2 pr-2 font-medium">Data</th>
                <th className="pb-2 pr-2 font-medium">Pkt</th>
                <th className="pb-2 pr-2 font-medium">Waga</th>
                <th className="pb-2 pr-1 font-medium">Wd</th>
                <th className="pb-2 pr-1 font-medium">Ps</th>
                <th className="pb-2 pr-1 font-medium">Tr</th>
                <th className="pb-2 pr-1 font-medium">Sp</th>
                <th className="pb-2 pr-1 font-medium">Ck</th>
                <th className="pb-2 pr-1 font-medium">Nc</th>
                <th className="pb-2 font-medium">Al</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 30).map((row) => {
                const s = dayScore({
                  drankLotsOfWater: row.drankLotsOfWater,
                  mealsCorrect: row.mealsCorrect,
                  trained: Boolean(row.trained),
                  walked: Boolean(row.walked),
                  limitedSugar: Boolean(row.limitedSugar),
                  ateLateNight: row.ateLateNight,
                  drankAlcohol: row.drankAlcohol,
                });
                const cls =
                  s < 0 ? "text-red-300" : s >= DAY_MAX_POSITIVE ? "text-amber-200" : "text-white/90";
                return (
                  <tr key={row.id} className="border-b border-[var(--border)]/60">
                    <td className="py-2 pr-2 whitespace-nowrap">{row.date.slice(0, 10)}</td>
                    <td className={`py-2 pr-2 font-medium ${cls}`}>
                      {s > 0 ? "+" : ""}
                      {s}
                    </td>
                    <td className="py-2 pr-2">{row.weightKg != null ? `${row.weightKg}` : "—"}</td>
                    <td className="py-2 pr-1">{row.drankLotsOfWater ? "✓" : "—"}</td>
                    <td className="py-2 pr-1">{row.mealsCorrect ? "✓" : "—"}</td>
                    <td className="py-2 pr-1">{row.trained ? "✓" : "—"}</td>
                    <td className="py-2 pr-1">{row.walked ? "✓" : "—"}</td>
                    <td className="py-2 pr-1">{row.limitedSugar ? "✓" : "—"}</td>
                    <td className="py-2 pr-1">{row.ateLateNight ? "!" : "—"}</td>
                    <td className="py-2">{row.drankAlcohol ? "!" : "—"}</td>
                  </tr>
                );
              })}
              {entries.length === 0 && !loadError && (
                <tr>
                  <td colSpan={10} className="py-6 text-[var(--muted)]">
                    Brak wpisów — dodaj pierwszy powyżej.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
