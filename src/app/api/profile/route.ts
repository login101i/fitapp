import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_ID = "default";

async function ensureProfile() {
  let profile = await prisma.profile.findUnique({ where: { id: DEFAULT_ID } });
  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        id: DEFAULT_ID,
        heightCm: 183,
        baselineWeightKg: 80,
      },
    });
  }
  return profile;
}

export async function GET() {
  try {
    const profile = await ensureProfile();
    return NextResponse.json(profile);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Błąd bazy danych. Sprawdź DATABASE_URL." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureProfile();
    const body = (await request.json()) as {
      heightCm?: number;
      baselineWeightKg?: number | null;
    };
    const heightCm =
      typeof body.heightCm === "number" && body.heightCm > 100 && body.heightCm < 250
        ? Math.round(body.heightCm)
        : undefined;
    const baselineWeightKg =
      body.baselineWeightKg === null
        ? null
        : typeof body.baselineWeightKg === "number" && body.baselineWeightKg > 30 && body.baselineWeightKg < 400
          ? body.baselineWeightKg
          : undefined;

    const data: { heightCm?: number; baselineWeightKg?: number | null } = {};
    if (heightCm !== undefined) data.heightCm = heightCm;
    if (baselineWeightKg !== undefined) data.baselineWeightKg = baselineWeightKg;

    if (Object.keys(data).length === 0) {
      const profile = await prisma.profile.findUnique({ where: { id: DEFAULT_ID } });
      return NextResponse.json(profile ?? (await ensureProfile()));
    }

    const profile = await prisma.profile.update({
      where: { id: DEFAULT_ID },
      data,
    });
    return NextResponse.json(profile);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Nie udało się zapisać profilu." }, { status: 500 });
  }
}
