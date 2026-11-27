import type { OhlcvCandle } from "./indicators";
import { formatDate, formatNumber, formatSignedPercent } from "./format";

export interface PlainAnalysisFacts {
  daysCount: number;
  trend20Pct: number | null;
  trend60Pct: number | null;
  up20: number;
  down20: number;
  up60: number;
  down60: number;
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

function classifyTrend(pct: number): string {
  if (pct > 3) return "يميل للصعود";
  if (pct < -3) return "يميل للنزول";
  return "يتحرك في نطاق ضيق / شبه مستقر";
}

export function buildPlainAnalysis(
  dailyCandles: OhlcvCandle[],
  stock: { ticker: string; nameAr?: string | null; lastPrice?: number | null }
): PlainAnalysisResult {
  const n = dailyCandles.length;
  const emptyFacts: PlainAnalysisFacts = {
    daysCount: n,
    trend20Pct: null,
    trend60Pct: null,
    up20: 0,
    down20: 0,
    up60: 0,
    down60: 0,
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
        "لم يُخزَّن سجل يومي لهذا السهم بعد. يمكنك استرجاع السجل التاريخي من صفحة الإدارة.",
      ],
      shortHistoryWarning: null,
      closingNote: CLOSING_NOTE,
      facts: emptyFacts,
    };
  }

  const last = dailyCandles[n - 1];
  const currentPrice = stock.lastPrice ?? last.close;
  const bullets: string[] = [];

  // 1. Trend 20 & 60 trading days
  let trend20Pct: number | null = null;
  let trend60Pct: number | null = null;
  if (n >= 21 && dailyCandles[n - 21].close > 0) {
    trend20Pct =
      ((last.close - dailyCandles[n - 21].close) / dailyCandles[n - 21].close) *
      100;
    bullets.push(
      `خلال آخر ٢٠ يوم تداول: السهم ${classifyTrend(trend20Pct)} بنسبة ${formatSignedPercent(trend20Pct)}.`
    );
  }
  if (n >= 61 && dailyCandles[n - 61].close > 0) {
    trend60Pct =
      ((last.close - dailyCandles[n - 61].close) / dailyCandles[n - 61].close) *
      100;
    bullets.push(
      `خلال آخر ٦٠ يوم تداول: السهم ${classifyTrend(trend60Pct)} بنسبة ${formatSignedPercent(trend60Pct)}.`
    );
  }

  // 2. Up vs Down days (20 & 60)
  let up20 = 0;
  let down20 = 0;
  const start20 = Math.max(1, n - 20);
  for (let i = start20; i < n; i++) {
    if (dailyCandles[i].close > dailyCandles[i - 1].close) up20++;
    else if (dailyCandles[i].close < dailyCandles[i - 1].close) down20++;
  }
  if (n >= 2) {
    const window20 = n - start20;
    bullets.push(
      `ارتفع في ${formatNumber(up20, { decimals: 0 })} يوماً ونزل في ${formatNumber(down20, { decimals: 0 })} يوماً من آخر ${formatNumber(window20, { decimals: 0 })} يوم تداول.`
    );
  }

  let up60 = 0;
  let down60 = 0;
  const start60 = Math.max(1, n - 60);
  for (let i = start60; i < n; i++) {
    if (dailyCandles[i].close > dailyCandles[i - 1].close) up60++;
    else if (dailyCandles[i].close < dailyCandles[i - 1].close) down60++;
  }

  // 3. Largest single-day gain & drop in last year (~252 trading days)
  const yearStart = Math.max(1, n - 252);
  let maxGainPct: number | null = null;
  let maxGainDate: string | null = null;
  let maxDropPct: number | null = null;
  let maxDropDate: string | null = null;

  for (let i = yearStart; i < n; i++) {
    const prev = dailyCandles[i - 1].close;
    if (prev <= 0) continue;
    const pct = ((dailyCandles[i].close - prev) / prev) * 100;
    if (maxGainPct === null || pct > maxGainPct) {
      maxGainPct = pct;
      maxGainDate = dailyCandles[i].timestamp;
    }
    if (maxDropPct === null || pct < maxDropPct) {
      maxDropPct = pct;
      maxDropDate = dailyCandles[i].timestamp;
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

  // 4. 52-week range position
  const yearSlice = dailyCandles.slice(Math.max(0, n - 252));
  const high52w = Math.max(...yearSlice.map((c) => c.high));
  const low52w = Math.min(...yearSlice.map((c) => c.low));
  let positionInRangePct: number | null = null;
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

  // 5. Volatility (avg absolute daily move last 30 days)
  let avgDailyMovePct: number | null = null;
  let volatilityLabel: "هادئ" | "متوسط" | "متقلب" | null = null;
  const volStart = Math.max(1, n - 30);
  const moves: number[] = [];
  for (let i = volStart; i < n; i++) {
    const prev = dailyCandles[i - 1].close;
    if (prev > 0) {
      moves.push(Math.abs((dailyCandles[i].close - prev) / prev) * 100);
    }
  }
  if (moves.length > 0) {
    avgDailyMovePct = moves.reduce((a, b) => a + b, 0) / moves.length;
    volatilityLabel =
      avgDailyMovePct < 1
        ? "هادئ"
        : avgDailyMovePct <= 2.5
          ? "متوسط"
          : "متقلب";
    bullets.push(
      `حركة السهم اليومية تُصنّف كـ "${volatilityLabel}" (متوسط التغيّر اليومي ${formatNumber(avgDailyMovePct, { decimals: 2 })}% في آخر ${formatNumber(moves.length, { decimals: 0 })} يوماً).`
    );
  }

  // 6. Trading activity (last volume vs 20-day avg)
  let volumeLabel: "أعلى من المعتاد" | "عادي" | "أقل من المعتاد" | null = null;
  const volWindow = dailyCandles.slice(Math.max(0, n - 20));
  const avgVol =
    volWindow.reduce((a, c) => a + c.volume, 0) / Math.max(1, volWindow.length);
  if (avgVol > 0) {
    const ratio = last.volume / avgVol;
    volumeLabel =
      ratio >= 1.3
        ? "أعلى من المعتاد"
        : ratio <= 0.7
          ? "أقل من المعتاد"
          : "عادي";
    bullets.push(`نشاط التداول في آخر يوم كان "${volumeLabel}" مقارنة بمتوسط آخر ٢٠ يوماً.`);
  }

  const shortHistoryWarning =
    n < 20
      ? `السجل المتاح لهذا السهم قصير (${formatNumber(n, { decimals: 0 })} يوماً)، لذلك التحليل أقل دقة.`
      : null;

  const headline =
    trend20Pct !== null
      ? `${stock.nameAr ?? stock.ticker}: ${classifyTrend(trend20Pct)} في آخر شهر`
      : `${stock.nameAr ?? stock.ticker}: ملخص السجل المتاح (${formatNumber(n, { decimals: 0 })} يوماً)`;

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
