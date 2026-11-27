import { BacktestConfig, runBacktest } from "./backtest";
import { OhlcvCandle, computeIndicatorSnapshot } from "./indicators";

export interface RankingWeights {
  winRateWeight: number; // 0..100
  avgReturnWeight: number; // 0..100
  drawdownWeight: number; // 0..100 (lower drawdown = higher score)
  volumeWeight: number; // 0..100
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  winRateWeight: 35,
  avgReturnWeight: 30,
  drawdownWeight: 20,
  volumeWeight: 15,
};

export interface HistoricalStatsBadge {
  sampleSize: number;
  winRate: number;
  avgReturnPct: number;
  maxDrawdownPct: number;
  periodStart: string | null;
  periodEnd: string | null;
  confidence: "مرتفعة" | "متوسطة" | "منخفضة";
  smallSampleWarning: boolean;
}

export interface RankedStockItem {
  ticker: string;
  nameAr: string;
  lastPrice: number | null;
  score: number;
  historicalStats: HistoricalStatsBadge;
  rsi14: number | null;
  volumeRatio: number | null;
}

export function computeConfidence(
  sampleSize: number,
  candleCount: number
): "مرتفعة" | "متوسطة" | "منخفضة" {
  if (sampleSize >= 30 && candleCount >= 250) return "مرتفعة";
  if (sampleSize >= 10 && candleCount >= 120) return "متوسطة";
  return "منخفضة";
}

export function rankStocks(
  items: { ticker: string; nameAr: string; lastPrice: number | null; candles: OhlcvCandle[] }[],
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS,
  backtestConfig: BacktestConfig = { strategy: "sma_crossover" }
): RankedStockItem[] {
  const totalWeight =
    weights.winRateWeight +
    weights.avgReturnWeight +
    weights.drawdownWeight +
    weights.volumeWeight;
  const norm = totalWeight > 0 ? totalWeight : 100;

  const ranked: RankedStockItem[] = items
    .filter((it) => it.candles.length >= 60)
    .map((it) => {
      const bt = runBacktest(it.candles, backtestConfig);
      const snap = computeIndicatorSnapshot(it.candles);

      const winComponent = Math.min(100, Math.max(0, bt.winRate));
      const retComponent = Math.min(100, Math.max(0, 50 + bt.avgReturnPct * 5));
      const ddComponent = Math.min(100, Math.max(0, 100 - bt.maxDrawdownPct * 2));
      const volComponent = Math.min(
        100,
        Math.max(0, (snap.volumeRatio ?? 1) * 50)
      );

      const score = Number(
        (
          (winComponent * weights.winRateWeight +
            retComponent * weights.avgReturnWeight +
            ddComponent * weights.drawdownWeight +
            volComponent * weights.volumeWeight) /
          norm
        ).toFixed(1)
      );

      return {
        ticker: it.ticker,
        nameAr: it.nameAr,
        lastPrice: it.lastPrice,
        score,
        historicalStats: {
          sampleSize: bt.totalTrades,
          winRate: bt.winRate,
          avgReturnPct: bt.avgReturnPct,
          maxDrawdownPct: bt.maxDrawdownPct,
          periodStart: bt.periodStart,
          periodEnd: bt.periodEnd,
          confidence: computeConfidence(bt.totalTrades, it.candles.length),
          smallSampleWarning: bt.smallSampleWarning,
        },
        rsi14: snap.rsi14,
        volumeRatio: snap.volumeRatio,
      };
    });

  return ranked.sort((a, b) => b.score - a.score);
}
