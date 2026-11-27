import { NextResponse } from "next/server";
import { and, asc, desc, eq, inArray, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { backfillProgress, candles, stocks, syncLogs } from "@/db/schema";
import { isAuthorized } from "@/lib/auth";
import { fetchYahooDailyHistory, medianDateGapDays } from "@/lib/yahoo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TIME_BUDGET_MS = 40_000;
const CHUNK_SIZE = 1000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureProgressRows() {
  const allStocks = await db
    .select({ ticker: stocks.ticker })
    .from(stocks);
  if (allStocks.length === 0) return;

  await db
    .insert(backfillProgress)
    .values(allStocks.map((s) => ({ ticker: s.ticker, status: "pending" })))
    .onConflictDoNothing();
}

async function getTotals() {
  const rows = await db
    .select({
      status: backfillProgress.status,
      count: sql<number>`count(*)::int`,
    })
    .from(backfillProgress)
    .groupBy(backfillProgress.status);

  const totals = { done: 0, pending: 0, no_match: 0, error: 0, total: 0 };
  for (const r of rows) {
    if (r.status === "done") totals.done = r.count;
    else if (r.status === "pending") totals.pending = r.count;
    else if (r.status === "no_match") totals.no_match = r.count;
    else if (r.status === "error") totals.error = r.count;
    totals.total += r.count;
  }
  return totals;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  try {
    await ensureProgressRows();
    const totals = await getTotals();
    const issues = await db
      .select()
      .from(backfillProgress)
      .where(ne(backfillProgress.status, "done"))
      .orderBy(desc(backfillProgress.updatedAt))
      .limit(20);

    const completed = await db
      .select()
      .from(backfillProgress)
      .where(eq(backfillProgress.status, "done"))
      .orderBy(asc(backfillProgress.ticker));

    return NextResponse.json({
      ok: true,
      totals,
      issues,
      completed,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "تعذّر قراءة حالة الاسترجاع.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const startedAt = Date.now();
  const body = (await request.json().catch(() => ({}))) as {
    reset?: boolean;
    batchSize?: number;
    tickers?: string[];
    retryErrors?: boolean;
  };

  // Task 2: wipe ONLY timeframe='1d' candles (NEVER touch '30m') and reset backfill_progress
  if (body.reset === true) {
    try {
      await db.delete(candles).where(eq(candles.timeframe, "1d"));
      await db.update(backfillProgress).set({
        status: "pending",
        attempts: 0,
        candlesCount: 0,
        firstDate: null,
        lastDate: null,
        message: null,
        yahooSymbol: null,
        updatedAt: new Date(),
      });
      await ensureProgressRows();
      return NextResponse.json({ ok: true, reset: true });
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : "تعذّر مسح البيانات اليومية وإعادة التعيين.",
        },
        { status: 500 }
      );
    }
  }

  const batchSize = Math.min(6, Math.max(1, Number(body.batchSize) || 3));
  const retryErrors = Boolean(body.retryErrors);

  try {
    await ensureProgressRows();

    let targets: { ticker: string; attempts: number }[] = [];

    if (Array.isArray(body.tickers) && body.tickers.length > 0) {
      const upper = body.tickers.map((t) => String(t).trim().toUpperCase());
      targets = await db
        .select({
          ticker: backfillProgress.ticker,
          attempts: backfillProgress.attempts,
        })
        .from(backfillProgress)
        .where(inArray(backfillProgress.ticker, upper))
        .orderBy(asc(backfillProgress.ticker))
        .limit(batchSize);
    } else {
      const condition = retryErrors
        ? or(
            eq(backfillProgress.status, "pending"),
            and(
              eq(backfillProgress.status, "error"),
              lt(backfillProgress.attempts, 3)
            )
          )
        : eq(backfillProgress.status, "pending");

      targets = await db
        .select({
          ticker: backfillProgress.ticker,
          attempts: backfillProgress.attempts,
        })
        .from(backfillProgress)
        .where(condition)
        .orderBy(asc(backfillProgress.ticker))
        .limit(batchSize);
    }

    const processed: Array<{
      ticker: string;
      status: string;
      candles: number;
      firstDate: string | null;
      lastDate: string | null;
      message: string;
    }> = [];

    for (let idx = 0; idx < targets.length; idx++) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) break;
      if (idx > 0) await sleep(300);

      const { ticker, attempts } = targets[idx];
      const res = await fetchYahooDailyHistory(ticker);

      const isValidDaily =
        res.status === "ok" &&
        res.candles.length > 0 &&
        (res.candles.length < 5 ||
          medianDateGapDays(res.candles.map((c) => c.date)) <= 3);

      if (isValidDaily) {
        // Insert '1d' candles in chunks of 1000; NEVER touch '30m' candles
        for (let i = 0; i < res.candles.length; i += CHUNK_SIZE) {
          const chunk = res.candles.slice(i, i + CHUNK_SIZE).map((c) => ({
            ticker,
            timeframe: "1d",
            timestamp: new Date(`${c.date}T00:00:00.000Z`),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
          }));

          await db
            .insert(candles)
            .values(chunk)
            .onConflictDoUpdate({
              target: [candles.ticker, candles.timeframe, candles.timestamp],
              set: {
                open: sql`excluded.open`,
                high: sql`excluded.high`,
                low: sql`excluded.low`,
                close: sql`excluded.close`,
                volume: sql`excluded.volume`,
              },
            });
        }

        const firstDate = res.candles[0].date;
        const lastDate = res.candles[res.candles.length - 1].date;
        const message = `تم استرجاع ${res.candles.length} يوم تداول (${firstDate} ← ${lastDate}).`;

        await db
          .update(backfillProgress)
          .set({
            status: "done",
            yahooSymbol: res.yahooSymbol,
            firstDate,
            lastDate,
            candlesCount: res.candles.length,
            attempts: attempts + 1,
            message,
            updatedAt: new Date(),
          })
          .where(eq(backfillProgress.ticker, ticker));

        processed.push({
          ticker,
          status: "done",
          candles: res.candles.length,
          firstDate,
          lastDate,
          message,
        });
      } else {
        const nextStatus = res.status === "no_match" ? "no_match" : "error";
        const message = res.error ?? "تعذّر استرجاع السجل التاريخي.";

        await db
          .update(backfillProgress)
          .set({
            status: nextStatus,
            yahooSymbol: res.yahooSymbol,
            attempts: attempts + 1,
            message,
            updatedAt: new Date(),
          })
          .where(eq(backfillProgress.ticker, ticker));

        processed.push({
          ticker,
          status: nextStatus,
          candles: 0,
          firstDate: null,
          lastDate: null,
          message,
        });
      }
    }

    const totals = await getTotals();
    const remaining = retryErrors ? totals.pending + totals.error : totals.pending;
    const finished = remaining === 0 || targets.length === 0;

    // سجل ملخص في sync_logs بـ requestsUsed = 0 حتى لا يُحسب على حصة Mansa
    await db
      .insert(syncLogs)
      .values({
        source: "yahoo",
        endpoint: "backfill",
        status: "success",
        recordsCount: processed.reduce((a, p) => a + p.candles, 0),
        requestsUsed: 0,
        message: `دفعة استرجاع: ${processed.length} سهم (مكتمل ${totals.done}/${totals.total}).`,
      })
      .catch(() => {});

    return NextResponse.json({
      ok: true,
      processed,
      remaining,
      totals,
      finished,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "خطأ أثناء الاسترجاع التاريخي.",
      },
      { status: 500 }
    );
  }
}
