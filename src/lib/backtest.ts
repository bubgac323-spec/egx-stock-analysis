import {
  OhlcvCandle,
  calcBollingerBands,
  calcMACD,
  calcRSI,
  calcSMA,
} from "./indicators";

export type StrategyKey =
  | "sma_crossover"
  | "rsi_oversold"
  | "macd_crossover"
  | "bollinger_reversion";

export interface BacktestConfig {
  strategy: StrategyKey;
  fastPeriod?: number;
  slowPeriod?: number;
  rsiPeriod?: number;
  rsiBuyBelow?: number;
  rsiSellAbove?: number;
  commissionPct?: number; // e.g., 0.15 for 0.15% per side (user-supplied, default 0)
  feeFixed?: number; // fixed fee per side in EGP (user-supplied, default 0)
}

export interface BacktestTrade {
  entryIndex: number;
  exitIndex: number;
  entryTimestamp: string;
  exitTimestamp: string;
  entryPrice: number;
  exitPrice: number;
  grossReturnPct: number;
  netReturnPct: number;
}

export interface BacktestSegmentStats {
  totalTrades: number;
  winRate: number;
  lossRate: number;
  avgWinPct: number;
  avgLossPct: number;
  avgReturnPct: number;
  totalReturnPct: number;
  buyAndHoldPct: number;
  maxDrawdownPct: number;
  periodStart: string | null;
  periodEnd: string | null;
  smallSampleWarning: boolean;
}

export interface BacktestSummary extends BacktestSegmentStats {
  strategy: StrategyKey;
  trades: BacktestTrade[];
  inSample: BacktestSegmentStats | null;
  outOfSample: BacktestSegmentStats | null;
}

function runSegment(
  candles: OhlcvCandle[],
  config: BacktestConfig
): { stats: BacktestSegmentStats; trades: BacktestTrade[] } {
  if (candles.length < 5) {
    return {
      stats: {
        totalTrades: 0,
        winRate: 0,
        lossRate: 0,
        avgWinPct: 0,
        avgLossPct: 0,
        avgReturnPct: 0,
        totalReturnPct: 0,
        buyAndHoldPct: 0,
        maxDrawdownPct: 0,
        periodStart: candles[0]?.timestamp ?? null,
        periodEnd: candles[candles.length - 1]?.timestamp ?? null,
        smallSampleWarning: true,
      },
      trades: [],
    };
  }

  const closes = candles.map((c) => c.close);
  const fastP = config.fastPeriod ?? 10;
  const slowP = config.slowPeriod ?? 25;
  const rsiP = config.rsiPeriod ?? 14;
  const rsiBuy = config.rsiBuyBelow ?? 30;
  const rsiSell = config.rsiSellAbove ?? 70;
  const commPct = Math.max(0, config.commissionPct ?? 0) / 100;
  const feeFixed = Math.max(0, config.feeFixed ?? 0);

  const smaFast = calcSMA(closes, fastP);
  const smaSlow = calcSMA(closes, slowP);
  const rsi = calcRSI(closes, rsiP);
  const macd = calcMACD(closes);
  const bb = calcBollingerBands(closes, 20, 2);

  const trades: BacktestTrade[] = [];
  let inPosition = false;
  let entryIdx = -1;
  let entryPrice = 0;

  let equity = 100;
  let peakEquity = 100;
  let maxDrawdown = 0;

  for (let i = 1; i < candles.length; i++) {
    let buySignal = false;
    let sellSignal = false;

    if (config.strategy === "sma_crossover") {
      if (
        smaFast[i - 1] !== null &&
        smaSlow[i - 1] !== null &&
        smaFast[i] !== null &&
        smaSlow[i] !== null
      ) {
        buySignal = smaFast[i - 1]! <= smaSlow[i - 1]! && smaFast[i]! > smaSlow[i]!;
        sellSignal = smaFast[i - 1]! >= smaSlow[i - 1]! && smaFast[i]! < smaSlow[i]!;
      }
    } else if (config.strategy === "rsi_oversold") {
      if (rsi[i] !== null) {
        buySignal = rsi[i]! < rsiBuy;
        sellSignal = rsi[i]! > rsiSell;
      }
    } else if (config.strategy === "macd_crossover") {
      const prev = macd[i - 1];
      const curr = macd[i];
      if (
        prev.macd !== null &&
        prev.signal !== null &&
        curr.macd !== null &&
        curr.signal !== null
      ) {
        buySignal = prev.macd <= prev.signal && curr.macd > curr.signal;
        sellSignal = prev.macd >= prev.signal && curr.macd < curr.signal;
      }
    } else if (config.strategy === "bollinger_reversion") {
      const curr = bb[i];
      if (curr.lower !== null && curr.upper !== null) {
        buySignal = closes[i] <= curr.lower;
        sellSignal = closes[i] >= curr.upper;
      }
    }

    if (!inPosition && buySignal) {
      inPosition = true;
      entryIdx = i;
      entryPrice = closes[i];
    } else if (inPosition && (sellSignal || i === candles.length - 1)) {
      const exitPrice = closes[i];
      const grossRet = entryPrice > 0 ? (exitPrice - entryPrice) / entryPrice : 0;
      const feeImpact = entryPrice > 0 ? (2 * feeFixed) / entryPrice : 0;
      const netRet = grossRet - 2 * commPct - feeImpact;

      trades.push({
        entryIndex: entryIdx,
        exitIndex: i,
        entryTimestamp: candles[entryIdx].timestamp,
        exitTimestamp: candles[i].timestamp,
        entryPrice: Number(entryPrice.toFixed(4)),
        exitPrice: Number(exitPrice.toFixed(4)),
        grossReturnPct: Number((grossRet * 100).toFixed(2)),
        netReturnPct: Number((netRet * 100).toFixed(2)),
      });

      equity *= 1 + netRet;
      if (equity > peakEquity) peakEquity = equity;
      const dd = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;

      inPosition = false;
      entryIdx = -1;
    }
  }

  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.netReturnPct > 0);
  const losses = trades.filter((t) => t.netReturnPct <= 0);
  const winRate = totalTrades > 0 ? Number(((wins.length / totalTrades) * 100).toFixed(1)) : 0;
  const lossRate = totalTrades > 0 ? Number(((losses.length / totalTrades) * 100).toFixed(1)) : 0;
  const avgWinPct =
    wins.length > 0
      ? Number((wins.reduce((a, t) => a + t.netReturnPct, 0) / wins.length).toFixed(2))
      : 0;
  const avgLossPct =
    losses.length > 0
      ? Number((losses.reduce((a, t) => a + t.netReturnPct, 0) / losses.length).toFixed(2))
      : 0;
  const avgReturnPct =
    totalTrades > 0
      ? Number((trades.reduce((a, t) => a + t.netReturnPct, 0) / totalTrades).toFixed(2))
      : 0;
  const totalReturnPct = Number((equity - 100).toFixed(2));
  const firstClose = closes[0];
  const lastClose = closes[closes.length - 1];
  const buyAndHoldPct =
    firstClose > 0 ? Number((((lastClose - firstClose) / firstClose) * 100).toFixed(2)) : 0;

  return {
    stats: {
      totalTrades,
      winRate,
      lossRate,
      avgWinPct,
      avgLossPct,
      avgReturnPct,
      totalReturnPct,
      buyAndHoldPct,
      maxDrawdownPct: Number(maxDrawdown.toFixed(2)),
      periodStart: candles[0].timestamp,
      periodEnd: candles[candles.length - 1].timestamp,
      smallSampleWarning: totalTrades < 30,
    },
    trades,
  };
}

export function runBacktest(
  candles: OhlcvCandle[],
  config: BacktestConfig
): BacktestSummary {
  const full = runSegment(candles, config);

  let inSample: BacktestSegmentStats | null = null;
  let outOfSample: BacktestSegmentStats | null = null;

  if (candles.length >= 40) {
    const splitIdx = Math.floor(candles.length * 0.7);
    inSample = runSegment(candles.slice(0, splitIdx), config).stats;
    outOfSample = runSegment(candles.slice(splitIdx), config).stats;
  }

  return {
    ...full.stats,
    strategy: config.strategy,
    trades: full.trades,
    inSample,
    outOfSample,
  };
}

export const STRATEGY_LABELS: Record<
  StrategyKey,
  { title: string; description: string }
> = {
  sma_crossover: {
    title: "تقاطع المتوسطات المتحركة (SMA)",
    description:
      "دخول تاريخي عند تقاطع المتوسط السريع فوق البطيء، وخروج عند التقاطع المعاكس.",
  },
  rsi_oversold: {
    title: "مؤشر القوة النسبية (RSI)",
    description:
      "دخول تاريخي عند هبوط RSI تحت حد التشبّع البيعي، وخروج عند تجاوز حد التشبّع الشرائي.",
  },
  macd_crossover: {
    title: "تقاطع MACD مع خط الإشارة",
    description:
      "دخول تاريخي عند صعود خط MACD فوق خط الإشارة، وخروج عند الهبوط تحته.",
  },
  bollinger_reversion: {
    title: "الارتداد داخل نطاقات بولينجر",
    description:
      "دخول تاريخي عند ملامسة الحد السفلي وخروج عند ملامسة الحد العلوي.",
  },
};
