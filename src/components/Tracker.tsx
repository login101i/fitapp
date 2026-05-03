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
  anchorLocalDateISO,
  dayScore,
  isPerfectDay,
  localWeekDatesISO,
  perfectStreak,
  totalPoints,
  weekMaxPointsThroughAnchor,
  weekPercentOfMax,
  weekPointsEarned,
  weekPointsEarnedThroughAnchor,
  weekPacePercentOfMax,
  weekTier,
  type ScoredDay,
  type TrainingType,
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
  waistCm: number | null;
  drankLotsOfWater: boolean;
  mealsCorrect: boolean;
  limitedSugar: boolean;
  trainingType: TrainingType;
  trainingProgress: boolean;
  steps: number | null;
  proteinTargetHit: boolean;
  sleepHours: number | null;
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

  /** Pusta na 1. render (SSR = klient); data ustawiana w useEffect — unika rozjazdu stref czasowych. */
  const [date, setDate] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [drankLotsOfWater, setDrankLotsOfWater] = useState(false);
  const [mealsCorrect, setMealsCorrect] = useState(false);
  const [limitedSugar, setLimitedSugar] = useState(false);
  const [trainingType, setTrainingType] = useState<TrainingType>("none");
  const [trainingProgress, setTrainingProgress] = useState(false);
  const [steps, setSteps] = useState("");
  const [proteinTargetHit, setProteinTargetHit] = useState(false);
  const [sleepHours, setSleepHours] = useState("");
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

  useEffect(() => {
    setDate(todayISO());
  }, []);

  const entryForDate = useMemo(() => {
    const day = date.slice(0, 10);
    return entries.find((e) => e.date.slice(0, 10) === day);
  }, [entries, date]);

  useEffect(() => {
    const e = entryForDate;
    if (!e) {
      setWeightKg("");
      setWaistCm("");
      setDrankLotsOfWater(false);
      setMealsCorrect(false);
      setLimitedSugar(false);
      setTrainingType("none");
      setTrainingProgress(false);
      setSteps("");
      setProteinTargetHit(false);
      setSleepHours("");
      setAteLateNight(false);
      setDrankAlcohol(false);
      return;
    }
    setWeightKg(e.weightKg != null ? String(e.weightKg) : "");
    setWaistCm(e.waistCm != null ? String(e.waistCm) : "");
    setDrankLotsOfWater(e.drankLotsOfWater);
    setMealsCorrect(e.mealsCorrect);
    setLimitedSugar(e.limitedSugar);
    setTrainingType(e.trainingType);
    setTrainingProgress(e.trainingProgress);
    setSteps(e.steps != null ? String(e.steps) : "");
    setProteinTargetHit(e.proteinTargetHit);
    setSleepHours(e.sleepHours != null ? String(e.sleepHours) : "");
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
    limitedSugar,
    trainingType,
    trainingProgress,
    steps: steps.trim() === "" ? null : Number(steps.replace(",", ".")),
    proteinTargetHit,
    sleepHours: sleepHours.trim() === "" ? null : Number(sleepHours.replace(",", ".")),
    ateLateNight,
    drankAlcohol,
  });

  const scoredEntries: ScoredDay[] = useMemo(() => {
    return entries.map((row) => ({
      date: row.date,
      drankLotsOfWater: row.drankLotsOfWater,
      mealsCorrect: row.mealsCorrect,
      limitedSugar: row.limitedSugar,
      trainingType: row.trainingType,
      trainingProgress: row.trainingProgress,
      steps: row.steps,
      proteinTargetHit: row.proteinTargetHit,
      sleepHours: row.sleepHours,
      ateLateNight: row.ateLateNight,
      drankAlcohol: row.drankAlcohol,
    }));
  }, [entries]);

  const sumPoints = totalPoints(scoredEntries);
  const streakPerfect = perfectStreak(scoredEntries, date);

  const weekAnchor = useMemo(() => {
    const d = date.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
    return new Date(`${d}T12:00:00`);
  }, [date]);

  const weekEarned = weekAnchor ? weekPointsEarned(scoredEntries, weekAnchor) : 0;
  const weekPct = weekAnchor ? weekPercentOfMax(scoredEntries, weekAnchor) : 0;
  const weekEarnedThrough = weekAnchor ? weekPointsEarnedThroughAnchor(scoredEntries, weekAnchor) : 0;
  const weekMaxThrough = weekAnchor ? weekMaxPointsThroughAnchor(weekAnchor) : DAY_MAX_POSITIVE;
  const weekPacePct = weekAnchor ? weekPacePercentOfMax(scoredEntries, weekAnchor) : 0;
  const paceTier = weekTier(weekPacePct);

  const weeklyInsight = useMemo(() => {
    if (!weekAnchor) {
      return {
        strengthSessions: 0,
        avgSteps: 0,
        proteinConsistency: 0,
        sleepAvg: null as number | null,
        waistTracked: false,
      };
    }
    const byDay = new Map(entries.map((e) => [e.date.slice(0, 10), e]));
    const rows = localWeekDatesISO(weekAnchor).map((iso) => byDay.get(iso) ?? null);
    const sleepRows = rows.filter((e): e is DailyRow => e?.sleepHours != null);
    return {
      strengthSessions: rows.filter((e) => e?.trainingType === "strength").length,
      avgSteps: Math.round(rows.reduce((sum, e) => sum + (e?.steps ?? 0), 0) / 7),
      proteinConsistency: Math.round((rows.filter((e) => e?.proteinTargetHit).length / 7) * 100),
      sleepAvg: sleepRows.length
        ? sleepRows.reduce((sum, e) => sum + (e.sleepHours ?? 0), 0) / sleepRows.length
        : null,
      waistTracked: rows.some((e) => e?.waistCm != null),
    };
  }, [entries, weekAnchor]);

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

    const readNumber = (raw: string, min: number, max: number, label: string): number | null | undefined => {
      if (raw.trim() === "") return null;
      const n = Number(raw.replace(",", "."));
      if (Number.isNaN(n) || n < min || n > max) {
        setSaveMsg(`Podaj sensowną wartość: ${label} albo zostaw puste.`);
        return undefined;
      }
      return n;
    };

    const w = readNumber(weightKg, 30, 400, "waga");
    const waist = readNumber(waistCm, 40, 250, "talia");
    const stepCount = readNumber(steps, 0, 100000, "kroki");
    const sleep = readNumber(sleepHours, 0, 24, "sen");
    if ([w, waist, stepCount, sleep].some((v) => v === undefined)) {
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
          waistCm: waist,
          drankLotsOfWater,
          mealsCorrect,
          limitedSugar,
          trainingType,
          trainingProgress,
          steps: stepCount != null ? Math.round(stepCount) : null,
          proteinTargetHit,
          sleepHours: sleep,
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
        limitedSugar: saved.limitedSugar,
        trainingType: saved.trainingType,
        trainingProgress: saved.trainingProgress,
        steps: saved.steps,
        proteinTargetHit: saved.proteinTargetHit,
        sleepHours: saved.sleepHours,
        ateLateNight: saved.ateLateNight,
        drankAlcohol: saved.drankAlcohol,
      };
      const pts = dayScore(savedInput);
      const feedback = [
        saved.trainingType === "strength" ? "budujesz mięśnie" : "brak bodźca siłowego",
        saved.trainingProgress ? "jest progres" : "brak progresu",
        saved.proteinTargetHit ? "białko trafione" : "za mało białka",
        (saved.steps ?? 0) >= 7000 ? "kroki OK" : "za mało kroków",
      ];
      setSaveMsg(`Zapisano. Recomp Score ${pts}/${DAY_MAX_POSITIVE} · ${feedback.slice(0, 3).join(" · ")}`);
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
    <div className="mx-auto max-w-3xl px-3 py-3 sm:px-4 sm:py-6 md:max-w-4xl">
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
        weekRef={weekAnchor ?? undefined}
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

      {weekAnchor && (
        <section className={`mb-3 p-3 sm:p-4 ${card} border-white/18`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Cel tygodnia (pierwsze miejsce)
                </p>
                <h2 className="text-base font-semibold text-white sm:text-lg">Czy jesteś na torze?</h2>
              </div>
              <p className="text-sm font-medium leading-snug text-white">
                {paceTier.id === "weak"
                  ? "Jeszcze nie — tempo od poniedziałku do dziś jest poniżej progu OK (poniżej 75%)."
                  : "Tak — tempo od poniedziałku do dziś mieści się w celu tygodnia (OK lub wyżej)."}
              </p>
              <p className="text-[11px] leading-relaxed text-[var(--muted)]">
                <strong className="text-[var(--text)]">Tempo</strong> (pon.–wybrany dzień{" "}
                <strong className="text-white">{anchorLocalDateISO(weekAnchor)}</strong>):{" "}
                <strong className="text-white">{weekEarnedThrough}</strong> / {weekMaxThrough} pkt (
                {weekPacePct.toFixed(0)}%). <strong className="text-[var(--text)]">Projekcja całego tygodnia</strong>{" "}
                (pon.–nie.): <strong className="text-white">{weekEarned}</strong> / {WEEK_MAX_POINTS} pkt (
                {weekPct.toFixed(0)}%).
              </p>
              <p className="border-t border-white/10 pt-2 text-[11px] leading-relaxed text-[var(--muted)]">
                <strong className="text-[var(--text)]">Ocena tygodnia:</strong> od{" "}
                <strong className="text-amber-200">95%</strong> — Super level;{" "}
                <strong className="text-emerald-200">85–95%</strong> — Świetnie;{" "}
                <strong className="text-sky-200">75–85%</strong> — OK; <strong className="text-red-200">&lt;75%</strong>{" "}
                — Słabo. Progi liczymy od <strong className="text-white">tempa pon.–dziś</strong>, żeby już po pierwszym
                dniu tygodnia widzieć realny postęp.
              </p>
              <p className="text-[11px] leading-relaxed text-[var(--muted)]">
                <strong className="text-[var(--text)]">Edytuj</strong> na liście (ikona koła zębatego) — ustawia datę w
                formularzu poniżej. <strong className="text-[var(--text)]">Usuń</strong> — kasuje dzień z bazy.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
              <span
                className={`rounded-xl border px-3 py-2 text-center text-sm font-semibold sm:min-w-[9.5rem] ${tierChipClass(paceTier.id)}`}
              >
                {paceTier.label}
              </span>
              <p className="text-center text-[11px] text-[var(--muted)] sm:text-right">
                {weekPacePct.toFixed(0)}% tempa
                <span className="block text-[10px] text-[var(--muted)]">wg progów powyżej</span>
              </p>
            </div>
          </div>
        </section>
      )}

      {loadError && (
        <div
          className={`mb-3 ${card} border-amber-500/35 bg-amber-950/55 px-3 py-2.5 text-xs text-amber-50 sm:text-sm`}
          role="alert"
        >
          {loadError}{" "}
          <span className="text-[var(--muted)]">
            Sprawdź w <code className="rounded bg-black/30 px-1">.env</code> dane{" "}
            <code className="rounded bg-black/30 px-1">DB_*</code>, czy istnieje wiersz z{" "}
            <code className="rounded bg-black/30 px-1">DB_FITAPP_ROW_ID</code> oraz kolumna{" "}
            <code className="rounded bg-black/30 px-1">fitapp</code> w tabeli{" "}
            <code className="rounded bg-black/30 px-1">TranslationsGerman</code>.
          </span>
        </div>
      )}

      <section className={`mb-3 p-3 sm:p-4 ${card}`}>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-base font-semibold">Czy dziś budujesz sylwetkę?</h2>
          <p className="text-[11px] text-[var(--muted)]">
            Recomp Score:{" "}
            <strong className={previewScore < 0 ? "text-red-300" : "text-amber-200"}>
              {Number.isFinite(previewScore) ? previewScore : 0}/{DAY_MAX_POSITIVE}
            </strong>{" "}
            (min {DAY_MIN_NET})
          </p>
        </div>
        <p className="mb-3 text-[11px] leading-snug text-[var(--muted)]">
          Premia idzie za siłę, progres, 7-10k kroków, białko, sen i podstawowe nawyki. Waga i talia są pomiarami
          pomocniczymi.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:gap-3">
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
              <span className="text-[var(--muted)]">Waga (kg, bez punktów)</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="—"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="mt-0.5 min-h-10 w-full rounded-lg border border-[var(--border)] bg-black/35 px-2 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block text-xs">
              <span className="text-[var(--muted)]">Talia (cm)</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="—"
                value={waistCm}
                onChange={(e) => setWaistCm(e.target.value)}
                className="mt-0.5 min-h-10 w-full rounded-lg border border-[var(--border)] bg-black/35 px-2 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            <legend className="col-span-full mb-0.5 text-[11px] text-[var(--muted)]">Trening i progres</legend>
            <label className="block text-xs">
              <span className="text-[var(--muted)]">Typ treningu</span>
              <select
                value={trainingType}
                onChange={(e) => {
                  const next = e.target.value as TrainingType;
                  setTrainingType(next);
                  if (next !== "strength") setTrainingProgress(false);
                }}
                className="mt-0.5 min-h-10 w-full rounded-lg border border-[var(--border)] bg-black/35 px-2 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              >
                <option value="none">Brak</option>
                <option value="strength">Siłowy (+3)</option>
                <option value="cardio">Cardio (0)</option>
              </select>
            </label>
            <label className="flex cursor-pointer items-start gap-2 pt-6 text-xs leading-snug">
              <input
                type="checkbox"
                checked={trainingProgress}
                disabled={trainingType !== "strength"}
                onChange={(e) => setTrainingProgress(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-[var(--border)] bg-black/35 accent-[var(--accent)]"
              />
              Progres vs ostatni tydzień <span className="text-amber-200">(+2)</span>
            </label>
          </fieldset>

          <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            <legend className="col-span-full mb-0.5 text-[11px] text-[var(--muted)]">Regeneracja i paliwo</legend>
            <label className="block text-xs">
              <span className="text-[var(--muted)]">Kroki</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="7000-10000"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                className="mt-0.5 min-h-10 w-full rounded-lg border border-[var(--border)] bg-black/35 px-2 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="flex cursor-pointer items-start gap-2 pt-6 text-xs leading-snug">
              <input
                type="checkbox"
                checked={proteinTargetHit}
                onChange={(e) => setProteinTargetHit(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-[var(--border)] bg-black/35 accent-[var(--accent)]"
              />
              Cel białka trafiony <span className="text-amber-200">(+3)</span>
            </label>
            <label className="block text-xs">
              <span className="text-[var(--muted)]">Sen (h)</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="7+"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                className="mt-0.5 min-h-10 w-full rounded-lg border border-[var(--border)] bg-black/35 px-2 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>
          </fieldset>

          <fieldset className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-1.5">
            <legend className="col-span-full mb-0.5 text-[11px] text-[var(--muted)]">Standardowe checkboxy</legend>
            <label className="flex cursor-pointer items-start gap-2 text-xs leading-snug">
              <input
                type="checkbox"
                checked={drankLotsOfWater}
                onChange={(e) => setDrankLotsOfWater(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-[var(--border)] bg-black/35 accent-[var(--accent)]"
              />
              Piłem dużo wody <span className="text-amber-200">(+1)</span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-xs leading-snug">
              <input
                type="checkbox"
                checked={mealsCorrect}
                onChange={(e) => setMealsCorrect(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-[var(--border)] bg-black/35 accent-[var(--accent)]"
              />
              Posiłki OK <span className="text-amber-200">(+1)</span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-xs leading-snug">
              <input
                type="checkbox"
                checked={limitedSugar}
                onChange={(e) => setLimitedSugar(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-[var(--border)] bg-black/35 accent-[var(--accent)]"
              />
              Ograniczałem cukier <span className="text-amber-200">(+1)</span>
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
          Recomp total: <strong className="text-white">{sumPoints}</strong> pkt
        </span>
        <span className="rounded-full border border-white/20 bg-black/30 px-2 py-1 backdrop-blur-sm">
          Seria {DAY_MAX_POSITIVE}/{DAY_MAX_POSITIVE}: <strong className="text-white">{streakPerfect}</strong>
        </span>
        {weekAnchor && (
          <>
            <span className="rounded-full border border-white/20 bg-black/30 px-2 py-1 backdrop-blur-sm">
              Tempo pon–dziś: <strong className="text-white">{weekEarnedThrough}</strong> / {weekMaxThrough} (
              {weekPacePct.toFixed(0)}%)
            </span>
            <span className="rounded-full border border-white/20 bg-black/30 px-2 py-1 backdrop-blur-sm">
              Cały tydzień: <strong className="text-white">{weekEarned}</strong> / {WEEK_MAX_POINTS} (
              {weekPct.toFixed(0)}%)
            </span>
            <span
              className={`rounded-full border px-2 py-1 font-medium backdrop-blur-sm ${tierChipClass(paceTier.id)}`}
            >
              {paceTier.label}
            </span>
          </>
        )}
      </div>

      <section className={`mb-3 grid grid-cols-2 gap-2 p-3 text-xs sm:grid-cols-4 sm:text-sm ${card}`}>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Trening siłowy</p>
          <p className="font-semibold">{weeklyInsight.strengthSessions}x</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Kroki avg</p>
          <p className="font-semibold">{weeklyInsight.avgSteps}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Białko</p>
          <p className="font-semibold">{weeklyInsight.proteinConsistency}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Sen avg</p>
          <p className="font-semibold">{weeklyInsight.sleepAvg != null ? `${weeklyInsight.sleepAvg.toFixed(1)} h` : "—"}</p>
        </div>
        <p className="col-span-full text-[11px] text-[var(--muted)]">
          Tracking sylwetki w tym tygodniu: talia {weeklyInsight.waistTracked ? "OK" : "brak"}.
        </p>
      </section>

      {profile && (
        <section className={`mb-3 grid grid-cols-3 gap-2 p-3 text-xs sm:text-sm ${card}`}>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Wzrost</p>
            <p className="font-semibold">{profile.heightCm} cm</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Waga pomocniczo</p>
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
        <h2 className="mb-1 text-base font-medium">Trend wagi</h2>
        <p className="mb-3 text-[11px] text-[var(--muted)]">Nie punktujemy spadku wagi. Liczy się proces i pomiary sylwetki.</p>
        <WeightChart entries={chartPoints} />
      </section>

      <section className={`p-3 sm:p-4 ${card}`}>
        <h2 className="mb-3 text-base font-medium">Ostatnie wpisy</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                <th className="pb-2 pr-2 font-medium">Data</th>
                <th className="pb-2 pr-2 font-medium">Recomp</th>
                <th className="pb-2 pr-2 font-medium">Waga</th>
                <th className="pb-2 pr-1 font-medium">Tr</th>
                <th className="pb-2 pr-1 font-medium">Pr</th>
                <th className="pb-2 pr-1 font-medium">Kr</th>
                <th className="pb-2 pr-1 font-medium">B</th>
                <th className="pb-2 pr-1 font-medium">Sen</th>
                <th className="pb-2 pr-1 font-medium">Wd</th>
                <th className="pb-2 pr-1 font-medium">Ps</th>
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
                  limitedSugar: row.limitedSugar,
                  trainingType: row.trainingType,
                  trainingProgress: row.trainingProgress,
                  steps: row.steps,
                  proteinTargetHit: row.proteinTargetHit,
                  sleepHours: row.sleepHours,
                  ateLateNight: row.ateLateNight,
                  drankAlcohol: row.drankAlcohol,
                });
                const cls =
                  s < 0 ? "text-red-300" : s >= DAY_MAX_POSITIVE ? "text-amber-200" : "text-white/90";
                return (
                  <tr key={row.id} className="border-b border-[var(--border)]/60">
                    <td className="py-2 pr-2 whitespace-nowrap">{row.date.slice(0, 10)}</td>
                    <td className={`py-2 pr-2 font-medium ${cls}`}>
                      {s}/{DAY_MAX_POSITIVE}
                    </td>
                    <td className="py-2 pr-2">{row.weightKg != null ? `${row.weightKg}` : "—"}</td>
                    <td className="py-2 pr-1">{row.trainingType === "strength" ? "S" : row.trainingType === "cardio" ? "C" : "—"}</td>
                    <td className="py-2 pr-1">{row.trainingProgress ? "✓" : "—"}</td>
                    <td className="py-2 pr-1">{row.steps ?? "—"}</td>
                    <td className="py-2 pr-1">{row.proteinTargetHit ? "✓" : "—"}</td>
                    <td className="py-2 pr-1">{row.sleepHours != null ? `${row.sleepHours}` : "—"}</td>
                    <td className="py-2 pr-1">{row.drankLotsOfWater ? "✓" : "—"}</td>
                    <td className="py-2 pr-1">{row.mealsCorrect ? "✓" : "—"}</td>
                    <td className="py-2 pr-1">{row.limitedSugar ? "✓" : "—"}</td>
                    <td className="py-2 pr-1">{row.ateLateNight ? "!" : "—"}</td>
                    <td className="py-2">{row.drankAlcohol ? "!" : "—"}</td>
                  </tr>
                );
              })}
              {entries.length === 0 && !loadError && (
                <tr>
                  <td colSpan={13} className="py-6 text-[var(--muted)]">
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
