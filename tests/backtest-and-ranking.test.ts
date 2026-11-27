import { describe, it, expect } from "vitest";
import { runBacktest } from "../src/lib/backtest";
import { rankStocks } from "../src/lib/ranking";
import type { OhlcvCandle } from "../src/lib/indicators";

function makeWaveCandles(count: number): OhlcvCandle[] {
  return Array.from({ length: count }, (_, i) => {
    const base = 50 + Math.sin(i / 4) * 10 + i * 0.05;
    return {
      timestamp: new Date(Date.UTC(2026, 0, 1) + i * 30 * 60_000).toISOString(),
      open: base,
      high: base + 1,
      low: base - 1,
      close: base,
      volume: 10000 + (i % 5) * 1000,
    };
  });
}

describe("الاختبار التاريخي وأداة الترتيب الشفاف", () => {
  it("يشغّل الاختبار التاريخي مع تقسيم داخل/خارج العينة وتحذير العينة الصغيرة", () => {
    const candles = makeWaveCandles(80);
    const summary = runBacktest(candles, {
      strategy: "sma_crossover",
      fastPeriod: 5,
      slowPeriod: 12,
      commissionPct: 0.15,
    });

    expect(summary.totalTrades).toBeGreaterThan(0);
    expect(summary.smallSampleWarning).toBe(true); // < 30 trades
    expect(summary.inSample).not.toBeNull();
    expect(summary.outOfSample).not.toBeNull();
  });

  it("يرفق كل سهم في الترتيب بإحصاءاته التاريخية الكاملة ومستوى الثقة", () => {
    const ranked = rankStocks([
      { ticker: "TEST1", nameAr: "سهم اختبار 1", lastPrice: 55, candles: makeWaveCandles(60) },
      { ticker: "TEST2", nameAr: "سهم اختبار 2", lastPrice: 40, candles: makeWaveCandles(60) },
    ]);

    expect(ranked.length).toBe(2);
    for (const item of ranked) {
      expect(item.historicalStats).toBeDefined();
      expect(typeof item.historicalStats.sampleSize).toBe("number");
      expect(typeof item.historicalStats.winRate).toBe("number");
      expect(typeof item.historicalStats.avgReturnPct).toBe("number");
      expect(typeof item.historicalStats.maxDrawdownPct).toBe("number");
      expect(["مرتفعة", "متوسطة", "منخفضة"]).toContain(item.historicalStats.confidence);
    }
  });
});
