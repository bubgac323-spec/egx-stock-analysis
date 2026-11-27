import { describe, it, expect } from "vitest";
import { parseYahooChart, toYahooSymbol } from "../src/lib/yahoo";
import { buildPlainAnalysis } from "../src/lib/plain-analysis";
import {
  formatNumber,
  formatSignedPercent,
  formatVolume,
} from "../src/lib/format";
import { matchStock } from "../src/lib/search";
import type { OhlcvCandle } from "../src/lib/indicators";

describe("اختبارات دوال الترقية (Yahoo + التحليل المبسط + التنسيق + البحث العربي)", () => {
  it("يحوّل رمز السهم إلى صيغة Yahoo ويحلل الشموع اليومية مع تجاهل القيم الناقصة", () => {
    expect(toYahooSymbol("comi")).toBe("COMI.CA");

    const sample = {
      chart: {
        result: [
          {
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

  it("ينشئ ملخصاً عربياً مبسطاً من الشموع اليومية ويحذّر عند قصر السجل", () => {
    const shortCandles: OhlcvCandle[] = Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
      open: 50 + i,
      high: 51 + i,
      low: 49 + i,
      close: 50 + i,
      volume: 10000,
    }));

    const res = buildPlainAnalysis(shortCandles, {
      ticker: "COMI",
      nameAr: "البنك التجاري الدولي",
      lastPrice: 59,
    });
    expect(res.shortHistoryWarning).toContain("قصير");
    expect(res.bullets.length).toBeGreaterThan(0);
    expect(res.closingNote).toContain("وليس توقعاً أو نصيحة");
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
    expect(
      matchStock("ابوقير", {
        ticker: "ABUK",
        nameAr: "ABUK",
        nameEn: "Abu Qir Fertilizers",
      })
    ).toBe(true);
  });
});
