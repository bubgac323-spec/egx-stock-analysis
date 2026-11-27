import type { OhlcvCandle } from "./indicators";
import { formatDate, formatNumber, formatSignedPercent } from "./format";
import { medianDateGapDays } from "./yahoo";

export interface PlainAnalysisFacts {
  daysCount: number;
  trend20Pct: number | null;
  trend60Pct: number | null;
  up20: number | null;
  down20: number | null;
  up60: number | null;
  down60: number | null;
  maxGainPct: number | null;
  maxGainDate: string | null;
  maxDropPct: number | null;
  maxDropDate: string | null;
  high52w: number | null;
  low52w: number | null;
  positionInRangePct: number | null;
  volatilityLabel: "هادئ" | "متوسط" | "متقلب" | null;
  avgDailyMovePct: number | null;
  volumeLabel: "أعلى من المعتاد" | "عادي" | "أقل من المعتاد" | null;
}

export interface PlainAnalysisResult {
  headline: string;
  bullets: string[];
  shortHistoryWarning: string | null;
  closingNote: string;
  facts: PlainAnalysisFacts;
}

const CLOSING_NOTE = "هذا وصف لما حدث في الماضي وليس توقعاً أو نصيحة.";
const DAY_MS = 86_400_000;

function classifyTrend(pct: number): string {
  if (pct > 3) return "يميل للصعود";
  if (pct < -3) return "يميل للنزول";
  return "يتحرك في نطاق ضيق / شبه مستقر";
}

export function assertDailySeries(candles: OhlcvCandle[]): boolean {
  if (candles.length < 5) return true;
  const dates = candles.map((c) => c.timestamp.slice(0, 10));
  return medianDateGapDays(dates) <= 3;
}

export function buildPlainAnalysis(
  dailyCandles: OhlcvCandle[],
  stock: { ticker: string; nameAr?: string | null; lastPrice?: number | null },
  now: Date = new Date()
): PlainAnalysisResult {
  const n = dailyCandles.length;
  const emptyFacts: PlainAnalysisFacts = {
    daysCount: n,
    trend20Pct: null,
    trend60Pct: null,
    up20: null,
    down20: null,
    up60: null,
    down60: null,
    maxGainPct: null,
    maxGainDate: null,
    maxDropPct: null,
    maxDropDate: null,
    high52w: null,
    low52w: null,
    positionInRangePct: null,
    volatilityLabel: null,
    avgDailyMovePct: null,
    volumeLabel: null,
  };

  if (n === 0) {
    return {
      headline: "لا توجد بيانات كافية بعد",
      bullets: [
        "لسه محمّلناش تاريخ الأسعار للسهم ده. تقدر تحمّله من صفحة الإدارة.",
      ],
      shortHistoryWarning: null,
      closingNote: CLOSING_NOTE,
      facts: emptyFacts,
    };
  }

  if (!assertDailySeries(dailyCandles)) {
    return {
      headline: "البيانات المخزّنة ليست يومية",
      bullets: [
        "البيانات المخزّنة لهذا السهم ليست يومية بشكل سليم. يرجى مسح البيانات اليومية وإعادة التحميل من صفحة الإدارة.",
      ],
      shortHistoryWarning: null,
      closingNote: CLOSING_NOTE,
      facts: emptyFacts,
    };
  }

  const nowMs = now.getTime();
  const last = dailyCandles[n - 1];
  const currentPrice = stock.lastPrice ?? last.close;
  const bullets: string[] = [];

  // 1. 20-day window: last 20 bars AND oldest bar within last 45 calendar days
  let trend20Pct: number | null = null;
  if (n >= 21) {
    const base20 = dailyCandles[n - 21];
    const ageDays = (nowMs - Date.parse(base20.timestamp)) / DAY_MS;
    if (ageDays <= 45 && base20.close > 0) {
      trend20Pct = ((last.close - base20.close) / base20.close) * 100;
      bullets.push(
        `خلال آخر ٢٠ يوم تداول: السهم ${classifyTrend(trend20Pct)} بنسبة ${formatSignedPercent(trend20Pct)}.`
      );
    }
  }

  // 2. 60-day window: last 60 bars AND oldest bar within last 120 calendar days
  let trend60Pct: number | null = null;
  if (n >= 61) {
    const base60 = dailyCandles[n - 61];
    const ageDays = (nowMs - Date.parse(base60.timestamp)) / DAY_MS;
    if (ageDays <= 120 && base60.close > 0) {
      trend60Pct = ((last.close - base60.close) / base60.close) * 100;
      bullets.push(
        `خلال آخر ٦٠ يوم تداول: السهم ${classifyTrend(trend60Pct)} بنسبة ${formatSignedPercent(trend60Pct)}.`
      );
    }
  }

  // 3. Up vs down days in last 20 bars (require >= 20 bars)
  let up20: number | null = null;
  let down20: number | null = null;
  if (n >= 21) {
    let u = 0;
    let d = 0;
    for (let i = n - 20; i < n; i++) {
      if (dailyCandles[i].close > dailyCandles[i - 1].close) u++;
      else if (dailyCandles[i].close < dailyCandles[i - 1].close) d++;
    }
    up20 = u;
    down20 = d;
    bullets.push(
      `ارتفع في ${formatNumber(u, { decimals: 0 })} يوماً ونزل في ${formatNumber(d, { decimals: 0 })} يوماً من آخر ٢٠ يوم تداول.`
    );
  }

  let up60: number | null = null;
  let down60: number | null = null;
  if (n >= 61) {
    let u = 0;
    let d = 0;
    for (let i = n - 60; i < n; i++) {
      if (dailyCandles[i].close > dailyCandles[i - 1].close) u++;
      else if (dailyCandles[i].close < dailyCandles[i - 1].close) d++;
    }
    up60 = u;
    down60 = d;
  }

  // 4. Real calendar 365-day slice
  const yearCutoffMs = nowMs - 365 * DAY_MS;
  const yearSlice = dailyCandles.filter(
    (c) => Date.parse(c.timestamp) >= yearCutoffMs
  );

  let maxGainPct: number | null = null;
  let maxGainDate: string | null = null;
  let maxDropPct: number | null = null;
  let maxDropDate: string | null = null;
  let high52w: number | null = null;
  let low52w: number | null = null;
  let positionInRangePct: number | null = null;

  if (yearSlice.length >= 60) {
    // Sanity guard: ignore unadjusted split artifacts (ratio outside 0.5..2.0) and moves > 50%
    for (let i = 1; i < yearSlice.length; i++) {
      const prev = yearSlice[i - 1].close;
      const curr = yearSlice[i].close;
      if (prev <= 0 || curr <= 0) continue;
      const ratio = curr / prev;
      if (ratio < 0.5 || ratio > 2.0) continue;
      const pct = ((curr - prev) / prev) * 100;
      if (Math.abs(pct) > 50) continue;

      if (maxGainPct === null || pct > maxGainPct) {
        maxGainPct = pct;
        maxGainDate = yearSlice[i].timestamp;
      }
      if (maxDropPct === null || pct < maxDropPct) {
        maxDropPct = pct;
        maxDropDate = yearSlice[i].timestamp;
      }
    }

    if (maxGainPct !== null && maxGainDate) {
      bullets.push(
        `أكبر ارتفاع في يوم واحد خلال السنة الأخيرة كان ${formatSignedPercent(maxGainPct)} بتاريخ ${formatDate(maxGainDate)}.`
      );
    }
    if (maxDropPct !== null && maxDropDate) {
      bullets.push(
        `أكبر نزول في يوم واحد خلال السنة الأخيرة كان ${formatSignedPercent(maxDropPct)} بتاريخ ${formatDate(maxDropDate)}.`
      );
    }

    high52w = Math.max(...yearSlice.map((c) => c.high));
    low52w = Math.min(...yearSlice.map((c) => c.low));
    if (high52w > low52w && low52w > 0) {
      const aboveLowPct = ((currentPrice - low52w) / low52w) * 100;
      const belowHighPct = ((high52w - currentPrice) / high52w) * 100;
      positionInRangePct = ((currentPrice - low52w) / (high52w - low52w)) * 100;
      const zone =
        positionInRangePct >= 66.7
          ? "قريب من القمة"
          : positionInRangePct <= 33.3
            ? "قريب من القاع"
            : "في المنتصف";
      bullets.push(
        `السعر الحالي أعلى من أدنى سعر في السنة بـ ${formatNumber(aboveLowPct, { decimals: 1 })}% وأقل من أعلى سعر بـ ${formatNumber(belowHighPct, { decimals: 1 })}% (${zone}).`
      );
    }
  }

  // 5. Volatility: last 30 bars, require >= 20 bars
  let avgDailyMovePct: number | null = null;
  let volatilityLabel: "هادئ" | "متوسط" | "متقلب" | null = null;
  if (n >= 20) {
    const volStart = Math.max(1, n - 30);
    const moves: number[] = [];
    for (let i = volStart; i < n; i++) {
      const prev = dailyCandles[i - 1].close;
      const curr = dailyCandles[i].close;
      if (prev > 0 && curr / prev >= 0.5 && curr / prev <= 2.0) {
        moves.push(Math.abs((curr - prev) / prev) * 100);
      }
    }
    if (moves.length >= 15) {
      avgDailyMovePct = moves.reduce((a, b) => a + b, 0) / moves.length;
      volatilityLabel =
        avgDailyMovePct < 1
          ? "هادئ"
          : avgDailyMovePct <= 2.5
            ? "متوسط"
            : "متقلب";
      bullets.push(
        `السعر بيتحرك يومياً بشكل "${volatilityLabel}" (متوسط التغيّر اليومي ${formatNumber(avgDailyMovePct, { decimals: 2 })}% في آخر ٣٠ يوم تداول).`
      );
    }
  }

  // 6. Trading activity: last volume vs 20-day avg
  let volumeLabel: "أعلى من المعتاد" | "عادي" | "أقل من المعتاد" | null = null;
  if (n >= 20) {
    const volWindow = dailyCandles.slice(n - 20);
    const avgVol = volWindow.reduce((a, c) => a + c.volume, 0) / volWindow.length;
    if (avgVol > 0) {
      const ratio = last.volume / avgVol;
      volumeLabel =
        ratio >= 1.3
          ? "أعلى من المعتاد"
          : ratio <= 0.7
            ? "أقل من المعتاد"
            : "عادي";
      bullets.push(
        `كمية التداول في آخر يوم كانت "${volumeLabel}" مقارنة بمتوسط آخر ٢٠ يوم تداول.`
      );
    }
  }

  const shortHistoryWarning =
    yearSlice.length < 60
      ? `البيانات المتاحة قصيرة (${formatNumber(yearSlice.length, { decimals: 0 })} يوماً في آخر سنة)، فالأرقام أقل دقة.`
      : null;

  const labelName = stock.nameAr ?? stock.ticker;
  const headline =
    trend20Pct !== null
      ? `${labelName}: ${classifyTrend(trend20Pct)} في آخر ٢٠ يوم تداول`
      : trend60Pct !== null
        ? `${labelName}: ${classifyTrend(trend60Pct)} في آخر ٦٠ يوم تداول`
        : `${labelName}: ملخص السجل المتاح (${formatNumber(n, { decimals: 0 })} يوماً)`;

  return {
    headline,
    bullets,
    shortHistoryWarning,
    closingNote: CLOSING_NOTE,
    facts: {
      daysCount: n,
      trend20Pct,
      trend60Pct,
      up20,
      down20,
      up60,
      down60,
      maxGainPct,
      maxGainDate,
      maxDropPct,
      maxDropDate,
      high52w,
      low52w,
      positionInRangePct,
      volatilityLabel,
      avgDailyMovePct,
      volumeLabel,
    },
  };
}
