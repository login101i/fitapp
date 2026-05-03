import { NextResponse } from "next/server";
import { loadFitAppRow, saveFitAppColumn } from "@/lib/fitapp-store";

const DEFAULT_ID = "default";

function mysqlErrorMessage(e: unknown): string {
  const err = e as { code?: string; message?: string };
  if (err?.code === "ECONNREFUSED" || err?.code === "ETIMEDOUT") return "Brak połączenia z MySQL.";
  return err?.message ?? "Błąd MySQL.";
}

export async function GET() {
  try {
    const { rowExists, outer, state } = await loadFitAppRow();
    if (!rowExists) {
      return NextResponse.json(
        {
          error:
            "Brak wiersza w tabeli (DB_FITAPP_TABLE / DB_FITAPP_ROW_ID). Utwórz rekord lub popraw .env.",
        },
        { status: 404 }
      );
    }
    return NextResponse.json({
      id: DEFAULT_ID,
      heightCm: state.profile.heightCm,
      baselineWeightKg: state.profile.baselineWeightKg,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: mysqlErrorMessage(e) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { rowExists, outer, state } = await loadFitAppRow();
    if (!rowExists) {
      return NextResponse.json(
        { error: "Brak wiersza w tabeli — zobacz DB_FITAPP_ROW_ID w .env." },
        { status: 404 }
      );
    }

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

    const next = { ...state, profile: { ...state.profile } };
    if (heightCm !== undefined) next.profile.heightCm = heightCm;
    if (baselineWeightKg !== undefined) next.profile.baselineWeightKg = baselineWeightKg;

    if (heightCm === undefined && baselineWeightKg === undefined) {
      return NextResponse.json({
        id: DEFAULT_ID,
        heightCm: state.profile.heightCm,
        baselineWeightKg: state.profile.baselineWeightKg,
      });
    }

    await saveFitAppColumn(outer, next);
    return NextResponse.json({
      id: DEFAULT_ID,
      heightCm: next.profile.heightCm,
      baselineWeightKg: next.profile.baselineWeightKg,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Nie udało się zapisać profilu." }, { status: 500 });
  }
}
