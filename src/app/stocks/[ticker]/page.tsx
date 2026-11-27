import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { backfillProgress } from "@/db/schema";
import { StockDetailView } from "@/components/StockDetailView";
import { computeIndicatorSnapshot } from "@/lib/indicators";
import {
  getCandlesForTicker,
  getDailyCandles,
  getStockByTicker,
} from "@/lib/market-data";
import { buildPlainAnalysis } from "@/lib/plain-analysis";
import { displayName } from "@/lib/arabic-names";

export const dynamic = "force-dynamic";

export default async function StockPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;

  // Task 5: redirect /stocks/<X>.CA -> /stocks/<X> before any DB call
  if (/\.ca$/i.test(ticker)) {
    redirect(`/stocks/${ticker.slice(0, -3).toUpperCase()}`);
  }

  const [stock, dailyCandles, intradayCandles] = await Promise.all([
    getStockByTicker(ticker),
    getDailyCandles(ticker, { limit: 365 }),
    getCandlesForTicker(ticker, "30m", { limit: 200 }),
  ]);

  if (!stock) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <h1 className="text-xl font-bold text-slate-900">
          السهم ({ticker.toUpperCase()}) مش موجود في قاعدة البيانات لسه
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          مفيش بيانات مخزّنة للسهم ده حالياً.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  let backfillStatus: string | null = null;
  try {
    const [bp] = await db
      .select({ status: backfillProgress.status })
      .from(backfillProgress)
      .where(eq(backfillProgress.ticker, stock.ticker))
      .limit(1);
    backfillStatus = bp?.status ?? null;
  } catch {
    backfillStatus = null;
  }

  // Task 4: keep fallback ONLY for technical indicators; plain analysis gets strictly '1d'
  const indicatorSource =
    dailyCandles.length >= 20 ? dailyCandles : intradayCandles;
  const indicators = computeIndicatorSnapshot(indicatorSource);
  const plainAnalysis = buildPlainAnalysis(dailyCandles, {
    ticker: stock.ticker,
    nameAr: displayName(stock),
    lastPrice: stock.lastPrice,
  });

  return (
    <StockDetailView
      stock={{
        ticker: stock.ticker,
        nameAr: displayName(stock),
        nameEn: stock.nameEn,
        sector: stock.sector,
        currency: stock.currency,
        lastPrice: stock.lastPrice,
        change: stock.change,
        changePct: stock.changePct,
        volume: stock.volume,
        open: stock.open,
        high: stock.high,
        low: stock.low,
        prevClose: stock.prevClose,
        delayMinutes: stock.delayMinutes,
        dataUpdatedAt: stock.dataUpdatedAt?.toISOString() ?? null,
      }}
      dailyCandles={dailyCandles}
      indicators={indicators}
      plainAnalysis={plainAnalysis}
      backfillStatus={backfillStatus}
    />
  );
}
