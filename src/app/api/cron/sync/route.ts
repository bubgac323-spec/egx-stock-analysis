import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { candles, stocks, syncLogs } from "@/db/schema";
import {
  MANSA_DEFAULT_DELAY_MINUTES,
  MANSA_FREE_DAILY_LIMIT,
  MANSA_FREE_MONTHLY_LIMIT,
  fetchEgxStocks,
} from "@/lib/mansa";
import { getMarketStatus } from "@/lib/market-data";
import { isAuthorized } from "@/lib/auth";
import { ARABIC_NAMES } from "@/lib/arabic-names";
import { TICKER_SECTOR_AR } from "@/lib/sectors";
import { toCairoDateString } from "@/lib/format";

export const dynamic = "force-dynamic";

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

/**
 * ملاحظة: هذه الدالة تحدّث شمعة اليوم ('1d') من بيانات Mansa دون أي طلب إضافي.
 * قد تحل بيانات Yahoo التاريخية محل هذه الشمعة لاحقاً عند الاسترجاع، وهذا مقبول.
 */
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
    const bucketMs = 30 * 60 * 1000;
    const bucketDate = new Date(Math.floor(now.getTime() / bucketMs) * bucketMs);
    const todayCairo = toCairoDateString(now);
    const dailyBucketDate = new Date(`${todayCairo}T00:00:00.000Z`);

    for (const q of quotes) {
      const arabicName = ARABIC_NAMES[q.ticker]?.ar ?? q.name;
      const resolvedSector =
        q.sector && q.sector !== "غير مصنّف"
          ? q.sector
          : TICKER_SECTOR_AR[q.ticker] ?? "غير مصنّف";

      await db
        .insert(stocks)
        .values({
          ticker: q.ticker,
          nameAr: arabicName,
          nameEn: q.name,
          sector: resolvedSector,
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
            // لا تستبدل اسماً عربياً محفوظاً باسم إنجليزي
            nameAr: ARABIC_NAMES[q.ticker]?.ar
              ? ARABIC_NAMES[q.ticker].ar
              : sql`CASE WHEN ${stocks.nameAr} <> ${stocks.nameEn} THEN ${stocks.nameAr} ELSE ${arabicName} END`,
            nameEn: q.name,
            // لا تستبدل قطاعاً معروفاً بـ "غير مصنّف"
            sector:
              resolvedSector !== "غير مصنّف"
                ? resolvedSector
                : sql`CASE WHEN ${stocks.sector} <> 'غير مصنّف' THEN ${stocks.sector} ELSE 'غير مصنّف' END`,
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
        // شمعة 30 دقيقة (بدون تعديل القديم)
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

        // شمعة يومية 1d لتاريخ اليوم بتوقيت القاهرة (يمتد السجل يومياً دون طلب إضافي)
        await db
          .insert(candles)
          .values({
            ticker: q.ticker,
            timeframe: "1d",
            timestamp: dailyBucketDate,
            open: q.open ?? q.price,
            high: q.high ?? q.price,
            low: q.low ?? q.price,
            close: q.price,
            volume: q.volume ?? 0,
          })
          .onConflictDoUpdate({
            target: [candles.ticker, candles.timeframe, candles.timestamp],
            set: {
              open: q.open ?? q.price,
              high: q.high ?? q.price,
              low: q.low ?? q.price,
              close: q.price,
              volume: q.volume ?? 0,
            },
          });
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
