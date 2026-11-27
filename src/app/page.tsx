import { MarketDashboard } from "@/components/MarketDashboard";
import { getMarketStatus, listStocks } from "@/lib/market-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [stocks, status] = await Promise.all([listStocks(), getMarketStatus()]);

  const serialized = stocks.map((s) => ({
    ticker: s.ticker,
    nameAr: s.nameAr,
    nameEn: s.nameEn,
    sector: s.sector,
    currency: s.currency,
    lastPrice: s.lastPrice,
    change: s.change,
    changePct: s.changePct,
    volume: s.volume,
    delayMinutes: s.delayMinutes,
    dataUpdatedAt: s.dataUpdatedAt?.toISOString() ?? null,
  }));

  return <MarketDashboard stocks={serialized} status={status} />;
}
