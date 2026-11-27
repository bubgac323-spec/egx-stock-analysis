import { NextResponse } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { candles, stocks } from "@/db/schema";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type PeriodKey = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";

function getPeriodStart(period: PeriodKey): Date | null {
  const now = new Date();
  const d = new Date(now);
  if (period === "1M") d.setMonth(d.getMonth() - 1);
  else if (period === "3M") d.setMonth(d.getMonth() - 3);
  else if (period === "6M") d.setMonth(d.getMonth() - 6);
  else if (period === "1Y") d.setFullYear(d.getFullYear() - 1);
  else if (period === "3Y") d.setFullYear(d.getFullYear() - 3);
  else if (period === "5Y") d.setFullYear(d.getFullYear() - 5);
  else return null;
  return d;
}

export async function GET(request: Request) {
  const rl = checkRateLimit(`compare:${getClientIp(request)}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "تم تجاوز الحد المسموح للطلبات. حاول بعد دقيقة." },
      { status: 429 }
    );
  }

  const url = new URL(request.url);
  const rawTickers = (url.searchParams.get("t") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 4);

  const period = (url.searchParams.get("period") ?? "6M") as PeriodKey;
  const periodStart = getPeriodStart(period);

  if (rawTickers.length === 0) {
    return NextResponse.json({ items: [], period });
  }

  try {
    const stockRows = await db
      .select()
      .from(stocks)
      .where(inArray(stocks.ticker, rawTickers));

    const candleRows = await db
      .select()
      .from(candles)
      .where(
        and(
          inArray(candles.ticker, rawTickers),
          eq(candles.timeframe, "1d")
        )
      )
      .orderBy(asc(candles.timestamp));

    const byTicker = new Map<string, typeof candleRows>();
    for (const c of candleRows) {
      const arr = byTicker.get(c.ticker) ?? [];
      arr.push(c);
      byTicker.set(c.ticker, arr);
    }

    const items = rawTickers
      .map((ticker) => {
        const s = stockRows.find((x) => x.ticker === ticker);
        if (!s) return null;
        const all = byTicker.get(ticker) ?? [];
        const firstDate = all[0]?.timestamp.toISOString().slice(0, 10) ?? null;
        const lastDate =
          all[all.length - 1]?.timestamp.toISOString().slice(0, 10) ?? null;

        // 52w stats (last 252 trading days)
        const yearSlice = all.slice(Math.max(0, all.length - 252));
        const high52w =
          yearSlice.length > 0 ? Math.max(...yearSlice.map((c) => c.high)) : null;
        const low52w =
          yearSlice.length > 0 ? Math.min(...yearSlice.map((c) => c.low)) : null;
        const currentPrice =
          s.lastPrice ?? (all.length > 0 ? all[all.length - 1].close : null);
        const rangePosPct =
          currentPrice !== null &&
          high52w !== null &&
          low52w !== null &&
          high52w > low52w
            ? Number((((currentPrice - low52w) / (high52w - low52w)) * 100).toFixed(1))
            : null;

        // Volatility (30d avg abs move)
        const volSlice = all.slice(Math.max(0, all.length - 31));
        const moves: number[] = [];
        for (let i = 1; i < volSlice.length; i++) {
          if (volSlice[i - 1].close > 0) {
            moves.push(
              Math.abs((volSlice[i].close - volSlice[i - 1].close) / volSlice[i - 1].close) *
                100
            );
          }
        }
        const volatilityPct =
          moves.length > 0
            ? Number((moves.reduce((a, b) => a + b, 0) / moves.length).toFixed(2))
            : null;

        // Period slice
        const periodSlice = periodStart
          ? all.filter((c) => c.timestamp >= periodStart)
          : all;

        const startsAfterPeriod =
          periodStart !== null &&
          all.length > 0 &&
          all[0].timestamp.getTime() > periodStart.getTime() + 14 * 86_400_000;

        let periodChangePct: number | null = null;
        let periodHigh: number | null = null;
        let periodLow: number | null = null;
        let maxDrawdownPct: number | null = null;
        let normalizedSeries: Array<{ date: string; value: number }> = [];

        if (periodSlice.length >= 2) {
          const base = periodSlice[0].close;
          const end = periodSlice[periodSlice.length - 1].close;
          if (base > 0) {
            periodChangePct = Number((((end - base) / base) * 100).toFixed(2));
          }
          periodHigh = Math.max(...periodSlice.map((c) => c.high));
          periodLow = Math.min(...periodSlice.map((c) => c.low));

          let peak = periodSlice[0].close;
          let maxDd = 0;
          for (const c of periodSlice) {
            if (c.close > peak) peak = c.close;
            if (peak > 0) {
              const dd = ((peak - c.close) / peak) * 100;
              if (dd > maxDd) maxDd = dd;
            }
          }
          maxDrawdownPct = Number(maxDd.toFixed(2));

          // Downsample to <= 80 points for crisp SVG chart
          const step = Math.max(1, Math.floor(periodSlice.length / 80));
          normalizedSeries = periodSlice
            .filter((_, idx) => idx % step === 0 || idx === periodSlice.length - 1)
            .map((c) => ({
              date: c.timestamp.toISOString().slice(0, 10),
              value: base > 0 ? Number(((c.close / base) * 100).toFixed(2)) : 100,
            }));
        }

        return {
          ticker: s.ticker,
          nameAr: s.nameAr,
          sector: s.sector,
          lastPrice: currentPrice,
          changePct: s.changePct,
          volume: s.volume,
          high52w,
          low52w,
          rangePosPct,
          volatilityPct,
          storedDays: all.length,
          firstDate,
          lastDate,
          startsAfterPeriod,
          periodChangePct: startsAfterPeriod ? null : periodChangePct,
          periodHigh,
          periodLow,
          maxDrawdownPct,
          normalizedSeries,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ period, items });
  } catch {
    return NextResponse.json({ period, items: [] }, { status: 200 });
  }
}
