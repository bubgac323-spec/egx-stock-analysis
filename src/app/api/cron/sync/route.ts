import { NextResponse } from "next/server";
import { db } from "@/db";
import { candles, stocks, syncLogs } from "@/db/schema";
import {
  MANSA_DEFAULT_DELAY_MINUTES,
  MANSA_FREE_DAILY_LIMIT,
  MANSA_FREE_MONTHLY_LIMIT,
  fetchEgxStocks,
} from "@/lib/mansa";
import { getMarketStatus } from "@/lib/market-data";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const adminKey = process.env.ADMIN_KEY;
  const cronSecret = process.env.CRON_SECRET;
  const headerKey = request.headers.get("x-admin-key");
  const auth = request.headers.get("authorization");

  if (adminKey && headerKey === adminKey) return true;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }
  return runSync();
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }
  return runSync();
}

async function runSync() {
  const status = await getMarketStatus();
  if (!status.dbConnected) {
    return NextResponse.json(
      { error: "قاعدة البيانات غير متصلة." },
      { status: 503 }
    );
  }

  if (
    status.requestsToday >= MANSA_FREE_DAILY_LIMIT ||
    status.requestsThisMonth >= MANSA_FREE_MONTHLY_LIMIT
  ) {
    return NextResponse.json(
      {
        error: "تم الوصول إلى حد الاستخدام المجاني لـ Mansa API (100/يوم أو 1500/شهر).",
        requestsToday: status.requestsToday,
        requestsThisMonth: status.requestsThisMonth,
      },
      { status: 429 }
    );
  }

  try {
    const quotes = await fetchEgxStocks(200, 0);
    const now = new Date();
    // Round timestamp to 30-minute bucket for 30m candle accumulation
    const bucketMs = 30 * 60 * 1000;
    const bucketDate = new Date(Math.floor(now.getTime() / bucketMs) * bucketMs);

    for (const q of quotes) {
      await db
        .insert(stocks)
        .values({
          ticker: q.ticker,
          nameAr: q.name,
          nameEn: q.name,
          sector: q.sector,
          currency: q.currency,
          lastPrice: q.price,
          change: q.change,
          changePct: q.changePct,
          volume: q.volume,
          open: q.open,
          high: q.high,
          low: q.low,
          prevClose: q.prevClose,
          delayMinutes: MANSA_DEFAULT_DELAY_MINUTES,
          dataUpdatedAt: q.timestamp ? new Date(q.timestamp) : now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: stocks.ticker,
          set: {
            nameAr: q.name,
            nameEn: q.name,
            sector: q.sector,
            lastPrice: q.price,
            change: q.change,
            changePct: q.changePct,
            volume: q.volume,
            open: q.open,
            high: q.high,
            low: q.low,
            prevClose: q.prevClose,
            delayMinutes: MANSA_DEFAULT_DELAY_MINUTES,
            dataUpdatedAt: q.timestamp ? new Date(q.timestamp) : now,
            updatedAt: now,
          },
        });

      if (q.price !== null) {
        await db
          .insert(candles)
          .values({
            ticker: q.ticker,
            timeframe: "30m",
            timestamp: bucketDate,
            open: q.open ?? q.price,
            high: q.high ?? q.price,
            low: q.low ?? q.price,
            close: q.price,
            volume: q.volume ?? 0,
          })
          .onConflictDoNothing();
      }
    }

    await db.insert(syncLogs).values({
      source: "mansa",
      endpoint: "/api/v1/markets/exchanges/EGX/stocks",
      status: "success",
      recordsCount: quotes.length,
      requestsUsed: 1,
      message: `تم تحديث ${quotes.length} سهماً من Mansa API.`,
    });

    return NextResponse.json({
      ok: true,
      synced: quotes.length,
      bucket: bucketDate.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطأ غير معروف";
    await db
      .insert(syncLogs)
      .values({
        source: "mansa",
        endpoint: "/api/v1/markets/exchanges/EGX/stocks",
        status: "error",
        recordsCount: 0,
        requestsUsed: 1,
        message,
      })
      .catch(() => {});

    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
