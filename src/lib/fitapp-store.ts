import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getMysqlPool } from "./mysql";

const TABLE = process.env.DB_FITAPP_TABLE ?? "TranslationsGerman";
const COL = process.env.DB_FITAPP_COLUMN ?? "fitapp";
const ID_COL = process.env.DB_FITAPP_ID_COLUMN ?? "id";
const ROW_ID_RAW = process.env.DB_FITAPP_ROW_ID ?? "1";

export type FitDailyEntry = {
  id: string;
  date: string;
  weightKg: number | null;
  waistCm: number | null;
  drankLotsOfWater: boolean;
  mealsCorrect: boolean;
  limitedSugar: boolean;
  trainingType: "strength" | "cardio" | "none";
  trainingProgress: boolean;
  steps: number | null;
  proteinTargetHit: boolean;
  sleepHours: number | null;
  ateLateNight: boolean;
  drankAlcohol: boolean;
};

export type FitAppState = {
  version: 1;
  profile: {
    heightCm: number;
    baselineWeightKg: number | null;
  };
  daily: FitDailyEntry[];
};

type ColumnRoot = Record<string, unknown>;

function defaultState(): FitAppState {
  return {
    version: 1,
    profile: { heightCm: 183, baselineWeightKg: 80 },
    daily: [],
  };
}

function rowIdParam(): string | number {
  const n = Number(ROW_ID_RAW);
  if (ROW_ID_RAW !== "" && Number.isFinite(n) && String(n) === ROW_ID_RAW.trim()) return n;
  return ROW_ID_RAW;
}

function parseJsonColumn(raw: unknown): unknown {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw;
  return null;
}

function asRecord(o: unknown): ColumnRoot | null {
  return o && typeof o === "object" && !Array.isArray(o) ? (o as ColumnRoot) : null;
}

function normalizeDaily(e: unknown): FitDailyEntry | null {
  if (!e || typeof e !== "object" || Array.isArray(e)) return null;
  const o = e as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : null;
  const date = typeof o.date === "string" ? o.date.slice(0, 10) : null;
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return null;
  const trainingType =
    o.trainingType === "strength" || o.trainingType === "cardio" || o.trainingType === "none"
      ? o.trainingType
      : Boolean(o.trained)
        ? "strength"
        : "none";
  const numberOrNull = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  return {
    id,
    date: date!,
    weightKg:
      o.weightKg === null || o.weightKg === undefined
        ? null
        : (() => {
            const n = Number(o.weightKg);
            return Number.isFinite(n) ? n : null;
          })(),
    waistCm: numberOrNull(o.waistCm),
    drankLotsOfWater: Boolean(o.drankLotsOfWater),
    mealsCorrect: Boolean(o.mealsCorrect),
    limitedSugar: Boolean(o.limitedSugar),
    trainingType,
    trainingProgress: Boolean(o.trainingProgress),
    steps: o.steps === undefined && Boolean(o.walked) ? 7000 : numberOrNull(o.steps),
    proteinTargetHit: Boolean(o.proteinTargetHit),
    sleepHours: numberOrNull(o.sleepHours),
    ateLateNight: Boolean(o.ateLateNight),
    drankAlcohol: Boolean(o.drankAlcohol),
  };
}

function normalizeState(inner: unknown): FitAppState {
  const base = defaultState();
  if (!inner || typeof inner !== "object" || Array.isArray(inner)) return base;
  const o = inner as Record<string, unknown>;
  const profile = o.profile;
  if (profile && typeof profile === "object" && !Array.isArray(profile)) {
    const p = profile as Record<string, unknown>;
    const h = Number(p.heightCm);
    if (Number.isFinite(h) && h > 100 && h < 250) base.profile.heightCm = Math.round(h);
    if (p.baselineWeightKg === null) base.profile.baselineWeightKg = null;
    else {
      const w = Number(p.baselineWeightKg);
      if (Number.isFinite(w) && w > 30 && w < 400) base.profile.baselineWeightKg = w;
    }
  }
  if (Array.isArray(o.daily)) {
    base.daily = o.daily.map(normalizeDaily).filter(Boolean) as FitDailyEntry[];
  }
  return base;
}

/** Odczyt surowego JSON z kolumny + sparsowany stan FitApp (pod kluczem fitApp lub cały obiekt). */
export function extractFitAppFromColumnJson(raw: unknown): { outer: ColumnRoot; state: FitAppState } {
  const parsed = parseJsonColumn(raw);
  const outer = asRecord(parsed) ?? {};
  const nested = outer.fitApp;
  if (nested && typeof nested === "object" && !Array.isArray(nested) && "profile" in nested && "daily" in nested) {
    return { outer, state: normalizeState(nested) };
  }
  if ("profile" in outer && "daily" in outer) {
    return { outer, state: normalizeState(outer) };
  }
  return { outer, state: defaultState() };
}

/** Zapisuje stan pod `fitApp`, usuwa z root ewentualne stare pola profilu/wpisów (migracja z płaskiego JSON). */
export function persistEnvelope(outer: ColumnRoot, state: FitAppState): ColumnRoot {
  const rest = { ...outer } as ColumnRoot;
  delete rest.fitApp;
  delete rest.version;
  delete rest.profile;
  delete rest.daily;
  return { ...rest, fitApp: state };
}

export async function loadFitAppRow(): Promise<{ rowExists: boolean; outer: ColumnRoot; state: FitAppState }> {
  const pool = getMysqlPool();
  const rid = rowIdParam();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT \`${COL}\` AS payload FROM \`${TABLE}\` WHERE \`${ID_COL}\` = ? LIMIT 1`,
    [rid]
  );
  if (!rows.length) return { rowExists: false, outer: {}, state: defaultState() };
  const raw = rows[0]?.payload;
  const { outer, state } = extractFitAppFromColumnJson(raw);
  return { rowExists: true, outer, state };
}

export async function saveFitAppColumn(outer: ColumnRoot, state: FitAppState): Promise<void> {
  const pool = getMysqlPool();
  const rid = rowIdParam();
  const merged = persistEnvelope(outer, state);
  const json = JSON.stringify(merged);
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE \`${TABLE}\` SET \`${COL}\` = ? WHERE \`${ID_COL}\` = ?`,
    [json, rid]
  );
  if (res.affectedRows === 0) {
    throw new Error(`Brak wiersza ${ID_COL}=${String(rid)} w tabeli ${TABLE}.`);
  }
}
