/** Maks. punkty „plus” za jeden dzień (woda, posiłki, trening, spacer, cukier). */
export const DAY_MAX_POSITIVE = 5;

/** Kara za jeden przełącznik (późny posiłek / alkohol). */
export const PENALTY_EACH = 1;

/** Najsłabszy możliwy wynik dnia: 0 plusów − 2 kary (−2). */
export const DAY_MIN_NET = -2;

/** Do wyświetlania „idealnego dnia” (wszystkie plusy, bez kar). */
export const DAY_MAX_POINTS = DAY_MAX_POSITIVE;

/** Teoretyczny max raw punktów w 7-dniowym tygodniu kalendarzowym (pon–niedz.). */
export const WEEK_MAX_POINTS = 7 * DAY_MAX_POSITIVE;

export type DayScoreInput = {
  drankLotsOfWater: boolean;
  mealsCorrect: boolean;
  trained: boolean;
  walked: boolean;
  limitedSugar: boolean;
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

/**
 * +1 za: wodę, posiłki, trening, spacer, ograniczenie cukru.
 * −1 jeśli zaznaczono jedzenie na noc lub alkohol (łącznie do −2).
 */
export function dayScore(e: DayScoreInput): number {
  let p = 0;
  if (e.drankLotsOfWater) p++;
  if (e.mealsCorrect) p++;
  if (e.trained) p++;
  if (e.walked) p++;
  if (e.limitedSugar) p++;
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
