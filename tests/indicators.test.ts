import { describe, it, expect } from "vitest";
import {
  calcBollingerBands,
  calcEMA,
  calcMACD,
  calcRSI,
  calcSMA,
} from "../src/lib/indicators";

describe("اختبارات وحدة المؤشرات الفنية", () => {
  it("يحسب المتوسط المتحرك البسيط (SMA) بدقة", () => {
    const sma3 = calcSMA([10, 20, 30, 40, 50], 3);
    expect(sma3).toEqual([null, null, 20, 30, 40]);
  });

  it("يحسب المتوسط المتحرك الأسي (EMA) بدقة", () => {
    const ema3 = calcEMA([10, 20, 30, 40], 3);
    expect(ema3[2]).toBe(20);
    // k = 2/(3+1) = 0.5 -> 40*0.5 + 20*0.5 = 30
    expect(ema3[3]).toBe(30);
  });

  it("يحسب مؤشر القوة النسبية (RSI) بدقة للسلاسل الصاعدة والهابطة", () => {
    const rising = Array.from({ length: 20 }, (_, i) => 10 + i);
    const rsiUp = calcRSI(rising, 14);
    expect(rsiUp[14]).toBe(100);

    const falling = Array.from({ length: 20 }, (_, i) => 50 - i);
    const rsiDown = calcRSI(falling, 14);
    expect(rsiDown[14]).toBe(0);
  });

  it("يحسب نطاقات بولينجر (Bollinger Bands) لسلسلة ثابتة", () => {
    const flat = Array.from({ length: 25 }, () => 100);
    const bb = calcBollingerBands(flat, 20, 2);
    expect(bb[24]).toEqual({ middle: 100, upper: 100, lower: 100 });
  });

  it("يحسب MACD لسلسلة كافية الطول", () => {
    const series = Array.from({ length: 40 }, (_, i) => 100 + i * 0.5);
    const macd = calcMACD(series);
    expect(macd[39].macd).not.toBeNull();
    expect(macd[39].signal).not.toBeNull();
    expect(macd[39].histogram).not.toBeNull();
  });
});
