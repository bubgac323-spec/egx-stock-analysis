import { NextResponse } from "next/server";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { candles } from "@/db/schema";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ ticker: string }> }
) {
  const rl = checkRateLimit(`history:${getClientIp(request)}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "تم تجاوز الحد المسموح للطلبات. حاول بعد دقيقة." },
      { status: 429 }
    );
  }

  const { ticker } = await context.params;
  const upper = ticker.trim().toUpperCase();
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(
    200,
    Math.max(10, Number(url.searchParams.get("pageSize")) || 50)
  );
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const sort = url.searchParams.get("sort") === "asc" ? "asc" : "desc";
  const direction = url.searchParams.get("direction") ?? "all"; // all | up | down

  try {
    const conditions = [
      eq(candles.ticker, upper),
      eq(candles.timeframe, "1d"),
    ];
    if (from) conditions.push(gte(candles.timestamp, new Date(`${from}T00:00:00.000Z`)));
    if (to) conditions.push(lte(candles.timestamp, new Date(`${to}T23:59:59.999Z`)));

    const allAsc = await db
      .select()
      .from(candles)
      .where(and(...conditions))
      .orderBy(asc(candles.timestamp));

    const enriched = allAsc.map((c, idx) => {
      const prevClose = idx > 0 ? allAsc[idx - 1].close : null;
      const change = prevClose !== null ? c.close - prevClose : null;
      const changePct =
        prevClose !== null && prevClose > 0
          ? ((c.close - prevClose) / prevClose) * 100
          : null;
      return {
        date: c.timestamp.toISOString().slice(0, 10),
        timestamp: c.timestamp.toISOString(),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        change,
        changePct,
      };
    });

    // Top 5 gain & drop dates across the filtered dataset
    const withPct = enriched.filter((r) => r.changePct !== null);
    const topGainDates = [...withPct]
      .filter((r) => (r.changePct ?? 0) > 0)
      .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))
      .slice(0, 5)
      .map((r) => r.date);
    const topDropDates = [...withPct]
      .filter((r) => (r.changePct ?? 0) < 0)
      .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0))
      .slice(0, 5)
      .map((r) => r.date);

    let filtered = enriched;
    if (direction === "up") {
      filtered = enriched.filter((r) => (r.change ?? 0) > 0);
    } else if (direction === "down") {
      filtered = enriched.filter((r) => (r.change ?? 0) < 0);
    }

    const ordered = sort === "desc" ? [...filtered].reverse() : filtered;
    const total = ordered.length;
    const start = (page - 1) * pageSize;
    const rows = ordered.slice(start, start + pageSize);

    return NextResponse.json({
      rows,
      total,
      page,
      pageSize,
      firstDate: allAsc[0]?.timestamp.toISOString().slice(0, 10) ?? null,
      lastDate:
        allAsc[allAsc.length - 1]?.timestamp.toISOString().slice(0, 10) ?? null,
      totalStoredDays: allAsc.length,
      topGainDates,
      topDropDates,
    });
  } catch {
    return NextResponse.json(
      {
        rows: [],
        total: 0,
        page,
        pageSize,
        firstDate: null,
        lastDate: null,
        totalStoredDays: 0,
        topGainDates: [],
        topDropDates: [],
      },
      { status: 200 }
    );
  }
}
