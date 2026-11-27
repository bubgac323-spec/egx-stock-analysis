import Link from "next/link";
import { StockDetailView } from "@/components/StockDetailView";
import { computeIndicatorSnapshot } from "@/lib/indicators";
import { getCandlesForTicker, getStockByTicker } from "@/lib/market-data";

export const dynamic = "force-dynamic";

export default async function StockPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const [stock, candles] = await Promise.all([
    getStockByTicker(ticker),
    getCandlesForTicker(ticker, "30m"),
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

  const indicators = computeIndicatorSnapshot(candles);

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
      candles={candles}
      indicators={indicators}
    />
  );
}
