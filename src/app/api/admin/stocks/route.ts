import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { stocks } from "@/db/schema";
import { isAuthorized } from "@/lib/auth";
import { hasArabic } from "@/lib/arabic-names";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  try {
    const all = await db.select().from(stocks).orderBy(asc(stocks.ticker));
    const missingArabic = all
      .filter((s) => !hasArabic(s.nameAr))
      .map((s) => ({
        ticker: s.ticker,
        nameAr: s.nameAr,
        nameEn: s.nameEn,
        sector: s.sector,
      }));

    return NextResponse.json({
      ok: true,
      total: all.length,
      missingCount: missingArabic.length,
      stocks: missingArabic,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "تعذّر قراءة قائمة الأسهم.",
      },
      { status: 500 }
    );
  }
}
