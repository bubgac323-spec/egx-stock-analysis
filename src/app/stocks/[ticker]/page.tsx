import Link from "next/link";
import { StockDetailView } from "@/components/StockDetailView";
import { computeIndicatorSnapshot } from "@/lib/indicators";
import {
  getCandlesForTicker,
  getDailyCandles,
  getStockByTicker,
} from "@/lib/market-data";
import { buildPlainAnalysis } from "@/lib/plain-analysis";

export const dynamic = "force-dynamic";

export default async function StockPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const [stock, dailyCandles, intradayCandles] = await Promise.all([
    getStockByTicker(ticker),
    getDailyCandles(ticker, { limit: 365 }),
    getCandlesForTicker(ticker, "30m", { limit: 200 }),
  ]);

  if (!stock) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900">
          السهم ({ticker.toUpperCase()}) غير متوفر في قاعدة البيانات حالياً
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          لم تُخزَّن بيانات هذا السهم بعد من Mansa API.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
        >
          العودة إلى لوحة السوق
        </Link>
      </div>
    );
  }

  const indicatorSource =
    dailyCandles.length >= 20 ? dailyCandles : intradayCandles;
  const indicators = computeIndicatorSnapshot(indicatorSource);
  const plainAnalysis = buildPlainAnalysis(dailyCandles, {
    ticker: stock.ticker,
    nameAr: stock.nameAr,
    lastPrice: stock.lastPrice,
  });

  return (
    <StockDetailView
      stock={{
        ticker: stock.ticker,
        nameAr: stock.nameAr,
        nameEn: stock.nameEn,
        sector: stock.sector,
        currency: stock.currency,
        lastPrice: stock.lastPrice,
        change: stock.change,
        changePct: stock.changePct,
        volume: stock.volume,
        delayMinutes: stock.delayMinutes,
        dataUpdatedAt: stock.dataUpdatedAt?.toISOString() ?? null,
      }}
      dailyCandles={dailyCandles}
      intradayCandles={intradayCandles}
      indicators={indicators}
      plainAnalysis={plainAnalysis}
    />
  );
}
