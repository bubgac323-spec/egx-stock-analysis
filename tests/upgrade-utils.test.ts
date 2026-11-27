import { describe, it, expect } from "vitest";
import {
  parseYahooChart,
  toYahooSymbol,
  validateYahooDailyPayload,
} from "../src/lib/yahoo";
import { assertDailySeries, buildPlainAnalysis } from "../src/lib/plain-analysis";
import {
  formatNumber,
  formatSignedPercent,
  formatVolume,
} from "../src/lib/format";
import { matchStock } from "../src/lib/search";
import { displayName, hasArabic, normalizeTicker } from "../src/lib/arabic-names";
import type { OhlcvCandle } from "../src/lib/indicators";

describe("اختبارات دوال الترقية (Yahoo + التحليل المبسط + التنسيق + البحث العربي)", () => {
  it("يحوّل رمز السهم إلى صيغة Yahoo ويحلل الشموع اليومية مع تجاهل القيم الناقصة", () => {
    expect(toYahooSymbol("comi")).toBe("COMI.CA");

    const sample = {
      chart: {
        result: [
          {
            meta: { dataGranularity: "1d" },
            timestamp: [1710028800, 1710115200, 1710201600],
            indicators: {
              quote: [
                {
                  open: [70, null, 72],
                  high: [73, 74, 75],
                  low: [69, 70, 71],
                  close: [72, null, 74],
                  volume: [100000, 50000, 200000],
                },
              ],
            },
          },
        ],
      },
    };

    const parsed = parseYahooChart(sample);
    expect(parsed.length).toBe(2);
    expect(parsed[0].open).toBe(70);
    expect(parsed[1].close).toBe(74);
  });

  it("يرفض استجابة Yahoo إذا لم يكن dataGranularity يساوي 1d", () => {
    const monthlyPayload = {
      chart: {
        result: [
          {
            meta: { dataGranularity: "1mo" },
            timestamp: [1704067200, 1706745600, 1709251200],
            indicators: {
              quote: [
                {
                  open: [50, 55, 60],
                  high: [56, 61, 65],
                  low: [49, 54, 58],
                  close: [55, 60, 64],
                  volume: [1000, 1000, 1000],
                },
              ],
            },
          },
        ],
      },
    };

    const result = validateYahooDailyPayload(monthlyPayload);
    expect(result.ok).toBe(false);
    expect(result.candles).toEqual([]);
    expect(result.error).toContain("غير يومي");
  });

  it("يخفي إحصاءات السنة عند قصر السجل داخل آخر 365 يوماً ويرفض السلاسل الشهرية", () => {
    const now = new Date("2026-11-27T12:00:00Z");
    const shortDaily: OhlcvCandle[] = Array.from({ length: 15 }, (_, i) => ({
      timestamp: new Date(
        now.getTime() - (15 - i) * 86_400_000
      ).toISOString(),
      open: 50 + i,
      high: 51 + i,
      low: 49 + i,
      close: 50 + i,
      volume: 10000,
    }));

    const res = buildPlainAnalysis(
      shortDaily,
      { ticker: "COMI", nameAr: "البنك التجاري الدولي", lastPrice: 64 },
      now
    );
    expect(res.shortHistoryWarning).toContain("قصيرة");
    expect(res.facts.maxGainPct).toBeNull();
    expect(res.facts.high52w).toBeNull();
    expect(res.closingNote).toContain("وليس توقعاً أو نصيحة");

    // Monthly series should fail assertDailySeries
    const monthly: OhlcvCandle[] = Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(Date.UTC(2025, i, 1)).toISOString(),
      open: 50,
      high: 55,
      low: 45,
      close: 52,
      volume: 1000,
    }));
    expect(assertDailySeries(monthly)).toBe(false);
  });

  it("يطبع رمز السهم ويزيل اللاحقة .CA بأي حالة أحرف", () => {
    expect(normalizeTicker("comi.ca")).toBe("COMI");
    expect(normalizeTicker("  ABUK.CA ")).toBe("ABUK");
    expect(normalizeTicker("hrho")).toBe("HRHO");
    expect(hasArabic("البنك التجاري")).toBe(true);
    expect(hasArabic("Catalyst Partners")).toBe(false);
    expect(displayName({ ticker: "COMI", nameAr: "CIB", nameEn: "CIB" })).toBe(
      "البنك التجاري الدولي"
    );
  });

  it("ينسّق الأرقام والنسب السالبة بشكل موحّد بالهندية العربية", () => {
    expect(formatNumber(null)).toBe("-");
    expect(formatSignedPercent(-0.75)).toContain("-");
    expect(formatSignedPercent(-0.75)).toContain("%");
    expect(formatVolume(2_500_000, true)).toContain("مليون");
  });

  it("يجد البحث عن (البنك التجاري) سهم COMI عبر التطبيع العربي", () => {
    expect(
      matchStock("البنك التجاري", {
        ticker: "COMI",
        nameAr: "Commercial International Bank",
        nameEn: "Commercial International Bank",
      })
    ).toBe(true);
  });
});
