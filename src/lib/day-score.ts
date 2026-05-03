/** Maks. punkty „plus” za dzień: rekompozycja + podstawowe dobre nawyki. */
export const DAY_MAX_POSITIVE = 15;

/** Kara za jeden przełącznik (późny posiłek / alkohol). */
export const PENALTY_EACH = 1;

/** Najsłabszy możliwy wynik dnia: brak plusów, sen < 6 h, nocne jedzenie i alkohol. */
export const DAY_MIN_NET = -3;

/** Do wyświetlania „idealnego dnia” (wszystkie plusy, bez kar). */
export const DAY_MAX_POINTS = DAY_MAX_POSITIVE;

/** Teoretyczny max raw punktów w 7-dniowym tygodniu kalendarzowym (pon–niedz.). */
export const WEEK_MAX_POINTS = 7 * DAY_MAX_POSITIVE;

export type TrainingType = "strength" | "cardio" | "none";

export type DayScoreInput = {
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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Lokalny tydzień kalendarzowy: pon–niedz. jako YYYY-MM-DD. */
export function localWeekDatesISO(ref = new Date()): string[] {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay();
  const offsetMon = (day + 6) % 7;
  d.setDate(d.getDate() - offsetMon);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    out.push(`${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`);
  }
  return out;
}

/** Recomposition Score: premiuje bodźce realnie zmieniające sylwetkę. */
export function dayScore(e: DayScoreInput): number {
  let p = 0;
  if (e.drankLotsOfWater) p += 1;
  if (e.mealsCorrect) p += 1;
  if (e.limitedSugar) p += 1;
  if (e.trainingType === "strength") p += 3;
  if (e.trainingType === "strength" && e.trainingProgress) p += 2;
  if ((e.steps ?? 0) >= 10000) p += 2;
  else if ((e.steps ?? 0) >= 7000) p += 1;
  if (e.proteinTargetHit) p += 3;
  if ((e.sleepHours ?? 0) >= 7) p += 2;
  else if (e.sleepHours != null && e.sleepHours < 6) p -= PENALTY_EACH;
  if (e.ateLateNight) p -= PENALTY_EACH;
  if (e.drankAlcohol) p -= PENALTY_EACH;
  return p;
}

/** Idealny dzień: wszystkie plusy (max dzienny) i brak kar. */
export function isPerfectDay(e: DayScoreInput): boolean {
  return dayScore(e) === DAY_MAX_POSITIVE;
}

export function totalPoints(entries: DayScoreInput[]): number {
  return entries.reduce((sum, e) => sum + dayScore(e), 0);
}

/** Suma pkt w bieżącym tygodniu lokalnym (dni bez wpisu liczą się jako 0). */
export function weekPointsEarned(entries: ScoredDay[], ref = new Date()): number {
  const map = new Map<string, DayScoreInput>();
  for (const e of entries) {
    map.set(e.date.slice(0, 10), e);
  }
  let sum = 0;
  for (const iso of localWeekDatesISO(ref)) {
    const row = map.get(iso);
    if (row) sum += dayScore(row);
  }
  return sum;
}

export function weekPercentOfMax(entries: ScoredDay[], ref = new Date()): number {
  if (WEEK_MAX_POINTS <= 0) return 0;
  return (weekPointsEarned(entries, ref) / WEEK_MAX_POINTS) * 100;
}

/** Lokalne YYYY-MM-DD kotwicy (bez UTC shift). */
export function anchorLocalDateISO(ref: Date): string {
  return `${ref.getFullYear()}-${pad2(ref.getMonth() + 1)}-${pad2(ref.getDate())}`;
}

/** Indeks dnia w tygodniu kalendarzowym: 0 = poniedziałek … 6 = niedziela. */
export function weekMondayIndex0(ref: Date): number {
  const week = localWeekDatesISO(ref);
  const anchor = anchorLocalDateISO(ref);
  const idx = week.indexOf(anchor);
  return idx >= 0 ? idx : 0;
}

/** Maks. pkt możliwe od pon. do dnia kotwicy (włącznie). */
export function weekMaxPointsThroughAnchor(ref: Date): number {
  return (weekMondayIndex0(ref) + 1) * DAY_MAX_POSITIVE;
}

/** Suma pkt od pon. do dnia kotwicy (włącznie); brak wpisu = 0 za ten dzień. */
export function weekPointsEarnedThroughAnchor(entries: ScoredDay[], ref: Date): number {
  const map = new Map<string, DayScoreInput>();
  for (const e of entries) {
    map.set(e.date.slice(0, 10), e);
  }
  const week = localWeekDatesISO(ref);
  const through = weekMondayIndex0(ref);
  let sum = 0;
  for (let i = 0; i <= through; i++) {
    const row = map.get(week[i]!);
    if (row) sum += dayScore(row);
  }
  return sum;
}

/**
 * Tempo tygodnia: % zdobytych pkt względem maksimum tylko za dni od pon. do dziś.
 * Działa sensownie już po pierwszym wpisie w tygodniu (nie dzieli przez całe 7×max).
 */
export function weekPacePercentOfMax(entries: ScoredDay[], ref: Date): number {
  const max = weekMaxPointsThroughAnchor(ref);
  if (max <= 0) return 0;
  return Math.min(100, (weekPointsEarnedThroughAnchor(entries, ref) / max) * 100);
}

export type WeekTierId = "super_level" | "great" | "ok" | "weak";

export function weekTier(percent: number): { id: WeekTierId; label: string } {
  if (percent >= 95) return { id: "super_level", label: "Super level" };
  if (percent >= 85) return { id: "great", label: "Świetnie" };
  if (percent >= 75) return { id: "ok", label: "OK" };
  return { id: "weak", label: "Słabo" };
}

export type ScoredDay = DayScoreInput & { date: string };

/** Seria kolejnych dni z rzędu (wstecz od kotwicy), każdy idealny (max dzienny). */
export function perfectStreak(entries: ScoredDay[], anchorDateISO: string): number {
  const map = new Map<string, DayScoreInput>();
  for (const e of entries) {
    map.set(e.date.slice(0, 10), e);
  }
  const anchor = anchorDateISO.slice(0, 10);
  const start = new Date(`${anchor}T12:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return 0;

  let streak = 0;
  const d = new Date(start);
  for (let i = 0; i < 400; i++) {
    const key = d.toISOString().slice(0, 10);
    const row = map.get(key);
    if (!row || !isPerfectDay(row)) break;
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}
