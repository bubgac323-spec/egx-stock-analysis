export interface OhlcvCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function calcSMA(values: number[], period: number): (number | null)[] {
  if (period <= 0) return values.map(() => null);
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = Number((sum / period).toFixed(4));
  }
  return out;
}

export function calcEMA(values: number[], period: number): (number | null)[] {
  if (period <= 0 || values.length < period) return values.map(() => null);
  const out: (number | null)[] = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let ema = sum / period;
  out[period - 1] = Number(ema.toFixed(4));
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    out[i] = Number(ema.toFixed(4));
  }
  return out;
}

export function calcRSI(values: number[], period = 14): (number | null)[] {
  if (period <= 0 || values.length <= period) return values.map(() => null);
  const out: (number | null)[] = new Array(values.length).fill(null);
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gainSum += diff;
    else lossSum += -diff;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  const rs0 = avgLoss === 0 ? Infinity : avgGain / avgLoss;
  out[period] = Number((avgLoss === 0 ? 100 : 100 - 100 / (1 + rs0)).toFixed(2));

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    out[i] = Number(rsi.toFixed(2));
  }
  return out;
}

export interface MacdPoint {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

export function calcMACD(
  values: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MacdPoint[] {
  const fast = calcEMA(values, fastPeriod);
  const slow = calcEMA(values, slowPeriod);
  const macdLine: (number | null)[] = values.map((_, i) =>
    fast[i] !== null && slow[i] !== null
      ? Number((fast[i]! - slow[i]!).toFixed(4))
      : null
  );

  const validMacd: number[] = [];
  const validIndices: number[] = [];
  macdLine.forEach((v, idx) => {
    if (v !== null) {
      validMacd.push(v);
      validIndices.push(idx);
    }
  });

  const signalVals = calcEMA(validMacd, signalPeriod);
  const signalLine: (number | null)[] = new Array(values.length).fill(null);
  validIndices.forEach((origIdx, j) => {
    signalLine[origIdx] = signalVals[j];
  });

  return values.map((_, i) => {
    const m = macdLine[i];
    const s = signalLine[i];
    return {
      macd: m,
      signal: s,
      histogram: m !== null && s !== null ? Number((m - s).toFixed(4)) : null,
    };
  });
}

export interface BollingerPoint {
  middle: number | null;
  upper: number | null;
  lower: number | null;
}

export function calcBollingerBands(
  values: number[],
  period = 20,
  stdDevMult = 2
): BollingerPoint[] {
  const sma = calcSMA(values, period);
  return values.map((_, i) => {
    const mid = sma[i];
    if (mid === null || i < period - 1) {
      return { middle: null, upper: null, lower: null };
    }
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      variance += Math.pow(values[j] - mid, 2);
    }
    const sd = Math.sqrt(variance / period);
    return {
      middle: mid,
      upper: Number((mid + stdDevMult * sd).toFixed(4)),
      lower: Number((mid - stdDevMult * sd).toFixed(4)),
    };
  });
}

export interface IndicatorSnapshot {
  sma20: number | null;
  sma50: number | null;
  ema12: number | null;
  ema26: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  bollingerUpper: number | null;
  bollingerMiddle: number | null;
  bollingerLower: number | null;
  volumeSma20: number | null;
  volumeRatio: number | null;
  volatilityPct: number | null;
}

export function computeIndicatorSnapshot(
  candles: OhlcvCandle[]
): IndicatorSnapshot {
  if (candles.length === 0) {
    return {
      sma20: null,
      sma50: null,
      ema12: null,
      ema26: null,
      rsi14: null,
      macd: null,
      macdSignal: null,
      macdHistogram: null,
      bollingerUpper: null,
      bollingerMiddle: null,
      bollingerLower: null,
      volumeSma20: null,
      volumeRatio: null,
      volatilityPct: null,
    };
  }
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const last = candles.length - 1;

  const sma20 = calcSMA(closes, 20)[last];
  const sma50 = calcSMA(closes, 50)[last];
  const ema12 = calcEMA(closes, 12)[last];
  const ema26 = calcEMA(closes, 26)[last];
  const rsi14 = calcRSI(closes, 14)[last];
  const macd = calcMACD(closes)[last];
  const bb = calcBollingerBands(closes, 20, 2)[last];
  const volSma = calcSMA(volumes, 20)[last];
  const volumeRatio =
    volSma && volSma > 0 ? Number((volumes[last] / volSma).toFixed(2)) : null;

  // Historical return standard deviation (volatility)
  let volatilityPct: number | null = null;
  if (closes.length >= 10) {
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      if (closes[i - 1] > 0) {
        returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
      }
    }
    if (returns.length > 1) {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance =
        returns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) /
        returns.length;
      volatilityPct = Number((Math.sqrt(variance) * 100).toFixed(2));
    }
  }

  return {
    sma20,
    sma50,
    ema12,
    ema26,
    rsi14,
    macd: macd.macd,
    macdSignal: macd.signal,
    macdHistogram: macd.histogram,
    bollingerUpper: bb.upper,
    bollingerMiddle: bb.middle,
    bollingerLower: bb.lower,
    volumeSma20: volSma,
    volumeRatio,
    volatilityPct,
  };
}

export const INDICATOR_DESCRIPTIONS = {
  rsi: {
    name: "مؤشر القوة النسبية (RSI 14)",
    beginner:
      "يقيس سرعة تغيّر السعر بين 0 و100. قراءة فوق 70 تصف تاريخياً منطقة تشبّع شرائي، وتحت 30 تصف منطقة تشبّع بيعي. لا يعني ذلك انعكاساً فورياً.",
    limit:
      "في الاتجاهات القوية قد يبقى RSI في منطقة التشبّع لفترة طويلة دون انعكاس.",
  },
  sma: {
    name: "المتوسطات المتحركة البسيطة (SMA 20 / 50)",
    beginner:
      "متوسط سعر الإغلاق لآخر 20 أو 50 شمعة. يُظهر الاتجاه العام التاريخي للسعر ويخفّف التذبذب اليومي.",
    limit:
      "مؤشر متأخر بطبيعته لأنه يعتمد على أسعار سابقة وقد يعطي إشارات متأخرة في الأسواق العرضية.",
  },
  macd: {
    name: "مؤشر MACD (12, 26, 9)",
    beginner:
      "يقيس الفرق بين متوسطين أسيّين (12 و26) مع خط إشارة (9) لتوضيح تغيّر الزخم التاريخي.",
    limit:
      "يعطي إشارات متكررة غير حاسمة عندما يتحرك السهم في نطاق أفقي ضيق.",
  },
  bollinger: {
    name: "نطاقات بولينجر (20, 2)",
    beginner:
      "قناة حول المتوسط المتحرك تتسع مع زيادة التذبذب وتضيق مع هدوء السعر.",
    limit:
      "ملامسة الحد العلوي أو السفلي لا تعني وحدها انعكاس السعر.",
  },
  volume: {
    name: "حجم التداول ونسبته للمتوسط",
    beginner:
      "يقارن حجم التداول الحالي بمتوسط آخر 20 شمعة لقياس نشاط السوق.",
    limit:
      "ارتفاع الحجم يصف زيادة النشاط فقط ولا يحدد اتجاه السعر المستقبلي.",
  },
} as const;
