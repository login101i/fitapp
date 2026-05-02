"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { WeightChart } from "./WeightChart";
import { bmiKgM2, formatBmi } from "@/lib/bmi";

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

  const [date, setDate] = useState(todayISO);
  const [weightKg, setWeightKg] = useState("");
  const [drankLotsOfWater, setDrankLotsOfWater] = useState(false);
  const [mealsCorrect, setMealsCorrect] = useState(false);
  const [ateLateNight, setAteLateNight] = useState(false);
  const [drankAlcohol, setDrankAlcohol] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [pr, list] = await Promise.all([
        fetch("/api/profile").then((r) => r.json()),
        fetch("/api/daily?days=120").then((r) => r.json()),
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
      setAteLateNight(false);
      setDrankAlcohol(false);
      return;
    }
    setWeightKg(e.weightKg != null ? String(e.weightKg) : "");
    setDrankLotsOfWater(e.drankLotsOfWater);
    setMealsCorrect(e.mealsCorrect);
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
      setSaveMsg("Zapisano.");
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">FitApp</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Dziennik wagi i nawyków — Next.js + PostgreSQL w chmurze (np. Neon).
        </p>
      </header>

      {loadError && (
        <div
          className="mb-6 rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
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

      {profile && (
        <section className="mb-8 grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Wzrost</p>
            <p className="text-lg font-medium">{profile.heightCm} cm</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Ostatnia / referencyjna waga
            </p>
            <p className="text-lg font-medium">
              {latestWeight != null ? `${latestWeight} kg` : "—"}
              {profile.baselineWeightKg != null && (
                <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                  (start: {profile.baselineWeightKg} kg)
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">BMI</p>
            <p className="text-lg font-medium">{bmi != null ? formatBmi(bmi) : "—"}</p>
          </div>
        </section>
      )}

      <section className="mb-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-lg font-medium">Dzisiejszy wpis</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-[var(--muted)]">Data</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block text-sm">
              <span className="text-[var(--muted)]">Waga (kg)</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="np. 79.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm text-[var(--muted)]">Nawyki</legend>
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={drankLotsOfWater}
                onChange={(e) => setDrankLotsOfWater(e.target.checked)}
                className="size-4 rounded border-[var(--border)] bg-[var(--bg)] accent-[var(--accent)]"
              />
              Piłem dużo wody
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={mealsCorrect}
                onChange={(e) => setMealsCorrect(e.target.checked)}
                className="size-4 rounded border-[var(--border)] bg-[var(--bg)] accent-[var(--accent)]"
              />
              Jadłem posiłki poprawnie (regularnie / zgodnie z planem)
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={ateLateNight}
                onChange={(e) => setAteLateNight(e.target.checked)}
                className="size-4 rounded border-[var(--border)] bg-[var(--bg)] accent-[var(--accent)]"
              />
              Jadłem na noc (późny posiłek)
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={drankAlcohol}
                onChange={(e) => setDrankAlcohol(e.target.checked)}
                className="size-4 rounded border-[var(--border)] bg-[var(--bg)] accent-[var(--accent)]"
              />
              Piłem alkohol
            </label>
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? "Zapisywanie…" : "Zapisz dzień"}
            </button>
            {saveMsg && <span className="text-sm text-[var(--muted)]">{saveMsg}</span>}
          </div>
        </form>
      </section>

      <section className="mb-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-lg font-medium">Trend wagi</h2>
        <WeightChart entries={chartPoints} />
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-lg font-medium">Ostatnie wpisy</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                <th className="pb-2 pr-3 font-medium">Data</th>
                <th className="pb-2 pr-3 font-medium">Waga</th>
                <th className="pb-2 pr-3 font-medium">Woda</th>
                <th className="pb-2 pr-3 font-medium">Posiłki</th>
                <th className="pb-2 pr-3 font-medium">Noc</th>
                <th className="pb-2 font-medium">Alkohol</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 30).map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)]/60">
                  <td className="py-2 pr-3">{row.date.slice(0, 10)}</td>
                  <td className="py-2 pr-3">{row.weightKg != null ? `${row.weightKg}` : "—"}</td>
                  <td className="py-2 pr-3">{row.drankLotsOfWater ? "✓" : "—"}</td>
                  <td className="py-2 pr-3">{row.mealsCorrect ? "✓" : "—"}</td>
                  <td className="py-2 pr-3">{row.ateLateNight ? "tak" : "—"}</td>
                  <td className="py-2">{row.drankAlcohol ? "tak" : "—"}</td>
                </tr>
              ))}
              {entries.length === 0 && !loadError && (
                <tr>
                  <td colSpan={6} className="py-6 text-[var(--muted)]">
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
