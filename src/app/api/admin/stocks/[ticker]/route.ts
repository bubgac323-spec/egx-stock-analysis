import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { stocks } from "@/db/schema";
import { isAuthorized } from "@/lib/auth";
import { normalizeTicker } from "@/lib/arabic-names";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ ticker: string }> }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const { ticker } = await context.params;
  const clean = normalizeTicker(ticker);

  try {
    const body = (await request.json()) as {
      nameAr?: string;
      sector?: string;
    };

    const updates: Partial<{ nameAr: string; sector: string; updatedAt: Date }> = {
      updatedAt: new Date(),
    };
    if (typeof body.nameAr === "string" && body.nameAr.trim() !== "") {
      updates.nameAr = body.nameAr.trim();
    }
    if (typeof body.sector === "string" && body.sector.trim() !== "") {
      updates.sector = body.sector.trim();
    }

    const updated = await db
      .update(stocks)
      .set(updates)
      .where(eq(stocks.ticker, clean))
      .returning({
        ticker: stocks.ticker,
        nameAr: stocks.nameAr,
        sector: stocks.sector,
      });

    if (updated.length === 0) {
      return NextResponse.json(
        { ok: false, error: "السهم غير موجود." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, stock: updated[0] });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "تعذّر حفظ التعديلات.",
      },
      { status: 500 }
    );
  }
}
