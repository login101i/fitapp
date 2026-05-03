import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { FitDailyEntry } from "@/lib/fitapp-store";
import { loadFitAppRow, saveFitAppColumn } from "@/lib/fitapp-store";

function parseDayISO(dateStr: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function daysAgoIso(days: number): string {
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  const y = from.getUTCFullYear();
  const mo = String(from.getUTCMonth() + 1).padStart(2, "0");
  const d = String(from.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function toApiRow(e: FitDailyEntry) {
  return {
    id: e.id,
    date: `${e.date}T12:00:00.000Z`,
    weightKg: e.weightKg,
    waistCm: e.waistCm,
    drankLotsOfWater: e.drankLotsOfWater,
    mealsCorrect: e.mealsCorrect,
    limitedSugar: e.limitedSugar,
    trainingType: e.trainingType,
    trainingProgress: e.trainingProgress,
    steps: e.steps,
    proteinTargetHit: e.proteinTargetHit,
    sleepHours: e.sleepHours,
    ateLateNight: e.ateLateNight,
    drankAlcohol: e.drankAlcohol,
  };
}

export async function GET(request: Request) {
  try {
    const { rowExists, state } = await loadFitAppRow();
    if (!rowExists) {
      return NextResponse.json({ error: "Brak wiersza w tabeli (DB_FITAPP_ROW_ID)." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(365, Math.max(7, Number(searchParams.get("days")) || 90));
    const fromStr = daysAgoIso(days);

    const filtered = state.daily
      .filter((e) => e.date >= fromStr)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(toApiRow);

    return NextResponse.json(filtered);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Błąd odczytu wpisów." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { rowExists, outer, state } = await loadFitAppRow();
    if (!rowExists) {
      return NextResponse.json({ error: "Brak wiersza w tabeli (DB_FITAPP_ROW_ID)." }, { status: 404 });
    }

    const body = (await request.json()) as {
      date?: string;
      weightKg?: number | null;
      waistCm?: number | null;
      drankLotsOfWater?: boolean;
      mealsCorrect?: boolean;
      limitedSugar?: boolean;
      trainingType?: "strength" | "cardio" | "none";
      trainingProgress?: boolean;
      steps?: number | null;
      proteinTargetHit?: boolean;
      sleepHours?: number | null;
      ateLateNight?: boolean;
      drankAlcohol?: boolean;
    };

    const dayIso = body.date ? parseDayISO(body.date) : null;
    if (!dayIso) {
      return NextResponse.json({ error: "Podaj datę w formacie YYYY-MM-DD." }, { status: 400 });
    }

    const weightKg =
      body.weightKg === null || body.weightKg === undefined
        ? undefined
        : typeof body.weightKg === "number" && body.weightKg > 30 && body.weightKg < 400
          ? body.weightKg
          : undefined;

    if (body.weightKg != null && weightKg === undefined) {
      return NextResponse.json({ error: "Nieprawidłowa wartość wagi (kg)." }, { status: 400 });
    }

    const optionalNumber = (value: unknown, min: number, max: number): number | null | undefined => {
      if (value === null || value === undefined || value === "") return null;
      const n = Number(value);
      if (!Number.isFinite(n) || n < min || n > max) return undefined;
      return n;
    };

    const trainingType =
      body.trainingType === "strength" || body.trainingType === "cardio" || body.trainingType === "none"
        ? body.trainingType
        : "none";
    const waistCm = optionalNumber(body.waistCm, 40, 250);
    const steps = optionalNumber(body.steps, 0, 100000);
    const sleepHours = optionalNumber(body.sleepHours, 0, 24);
    if (
      waistCm === undefined ||
      steps === undefined ||
      sleepHours === undefined
    ) {
      return NextResponse.json({ error: "Nieprawidłowa wartość liczbowa we wpisie." }, { status: 400 });
    }

    const next = { ...state, daily: [...state.daily] };
    const idx = next.daily.findIndex((e) => e.date === dayIso);
    const prevW = idx >= 0 ? next.daily[idx]!.weightKg : null;
    const resolvedWeight = weightKg !== undefined ? weightKg : prevW;
    const patch: Omit<FitDailyEntry, "id" | "date"> = {
      weightKg: resolvedWeight,
      waistCm,
      drankLotsOfWater: Boolean(body.drankLotsOfWater),
      mealsCorrect: Boolean(body.mealsCorrect),
      limitedSugar: Boolean(body.limitedSugar),
      trainingType,
      trainingProgress: trainingType === "strength" && Boolean(body.trainingProgress),
      steps,
      proteinTargetHit: Boolean(body.proteinTargetHit),
      sleepHours,
      ateLateNight: Boolean(body.ateLateNight),
      drankAlcohol: Boolean(body.drankAlcohol),
    };

    if (idx >= 0) {
      const id = next.daily[idx]!.id;
      next.daily[idx] = { id, date: dayIso, ...patch };
    } else {
      next.daily.push({ id: randomUUID(), date: dayIso, ...patch });
    }

    await saveFitAppColumn(outer, next);
    const saved = next.daily.find((e) => e.date === dayIso)!;
    return NextResponse.json(toApiRow(saved));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Nie udało się zapisać dnia." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { rowExists, outer, state } = await loadFitAppRow();
    if (!rowExists) {
      return NextResponse.json({ error: "Brak wiersza w tabeli (DB_FITAPP_ROW_ID)." }, { status: 404 });
    }

    const body = (await request.json()) as { date?: string };
    const dayIso = body.date ? parseDayISO(body.date) : null;
    if (!dayIso) {
      return NextResponse.json({ error: "Podaj datę w formacie YYYY-MM-DD." }, { status: 400 });
    }

    const before = state.daily.length;
    const next = { ...state, daily: state.daily.filter((e) => e.date !== dayIso) };
    if (next.daily.length === before) {
      return NextResponse.json({ error: "Brak wpisu dla tej daty." }, { status: 404 });
    }

    await saveFitAppColumn(outer, next);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Nie udało się usunąć wpisu." }, { status: 500 });
  }
}
