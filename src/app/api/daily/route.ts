import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function parseDayUTC(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(365, Math.max(7, Number(searchParams.get("days")) || 90));
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - days);
    from.setUTCHours(0, 0, 0, 0);

    const entries = await prisma.dailyEntry.findMany({
      where: { date: { gte: from } },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(entries);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Błąd odczytu wpisów." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      date?: string;
      weightKg?: number | null;
      drankLotsOfWater?: boolean;
      mealsCorrect?: boolean;
      ateLateNight?: boolean;
      drankAlcohol?: boolean;
    };

    const day = body.date ? parseDayUTC(body.date) : null;
    if (!day) {
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

    const entry = await prisma.dailyEntry.upsert({
      where: { date: day },
      create: {
        date: day,
        weightKg: weightKg ?? null,
        drankLotsOfWater: Boolean(body.drankLotsOfWater),
        mealsCorrect: Boolean(body.mealsCorrect),
        ateLateNight: Boolean(body.ateLateNight),
        drankAlcohol: Boolean(body.drankAlcohol),
      },
      update: {
        ...(weightKg !== undefined ? { weightKg } : {}),
        drankLotsOfWater: Boolean(body.drankLotsOfWater),
        mealsCorrect: Boolean(body.mealsCorrect),
        ateLateNight: Boolean(body.ateLateNight),
        drankAlcohol: Boolean(body.drankAlcohol),
      },
    });

    return NextResponse.json(entry);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Nie udało się zapisać dnia." }, { status: 500 });
  }
}
