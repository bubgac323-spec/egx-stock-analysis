import { toCairoDateString } from "./format";

export interface DailyCandle {
  date: string; // YYYY-MM-DD in Africa/Cairo
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const YAHOO_SYMBOL_OVERRIDES: Record<string, string> = {
  // أضف أي استثناءات هنا إذا اختلف رمز السهم في Yahoo عن Mansa
};

export function toYahooSymbol(ticker: string): string {
  const upper = ticker.trim().toUpperCase().replace(/\.CA$/i, "");
  return YAHOO_SYMBOL_OVERRIDES[upper] ?? `${upper}.CA`;
}

export function getYahooDataGranularity(json: unknown): string | null {
  const root = json as {
    chart?: {
      result?: Array<{
        meta?: { dataGranularity?: string };
      }>;
    };
  };
  const g = root?.chart?.result?.[0]?.meta?.dataGranularity;
  return typeof g === "string" ? g : null;
}

export function medianDateGapDays(dates: string[]): number {
  if (dates.length < 2) return 0;
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const t0 = Date.parse(dates[i - 1]);
    const t1 = Date.parse(dates[i]);
    if (Number.isFinite(t0) && Number.isFinite(t1) && t1 > t0) {
      gaps.push((t1 - t0) / 86_400_000);
    }
  }
  if (gaps.length === 0) return 0;
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  return gaps.length % 2 === 1 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
}

export function parseYahooChart(json: unknown): DailyCandle[] {
  const root = json as {
    chart?: {
      error?: unknown;
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            open?: Array<number | null>;
            high?: Array<number | null>;
            low?: Array<number | null>;
            close?: Array<number | null>;
            volume?: Array<number | null>;
          }>;
        };
      }>;
    };
  };

  const result = root?.chart?.result?.[0];
  if (!result || !Array.isArray(result.timestamp)) return [];

  const quote = result.indicators?.quote?.[0];
  if (!quote) return [];

  const opens = quote.open ?? [];
  const highs = quote.high ?? [];
  const lows = quote.low ?? [];
  const closes = quote.close ?? [];
  const volumes = quote.volume ?? [];

  const byDate = new Map<string, DailyCandle>();

  for (let i = 0; i < result.timestamp.length; i++) {
    const ts = result.timestamp[i];
    const open = opens[i];
    const high = highs[i];
    const low = lows[i];
    const close = closes[i];
    const volume = volumes[i] ?? 0;

    if (
      typeof ts !== "number" ||
      typeof open !== "number" ||
      typeof high !== "number" ||
      typeof low !== "number" ||
      typeof close !== "number" ||
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close)
    ) {
      continue;
    }

    const date = toCairoDateString(new Date(ts * 1000));
    byDate.set(date, {
      date,
      open,
      high,
      low,
      close,
      volume: typeof volume === "number" && Number.isFinite(volume) ? volume : 0,
    });
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function validateYahooDailyPayload(json: unknown): {
  ok: boolean;
  candles: DailyCandle[];
  error?: string;
} {
  const granularity = getYahooDataGranularity(json);
  if (granularity !== "1d") {
    return {
      ok: false,
      candles: [],
      error: `Yahoo أعاد بيانات بفاصل زمني غير يومي (${granularity ?? "غير معروف"}) لهذا السهم.`,
    };
  }
  const candles = parseYahooChart(json);
  if (candles.length >= 5 && medianDateGapDays(candles.map((c) => c.date)) > 3) {
    return {
      ok: false,
      candles: [],
      error: "البيانات الواردة من Yahoo ليست يومية (الفجوة الزمنية بين الأيام أكبر من 3 أيام).",
    };
  }
  return { ok: true, candles };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchYahooDailyHistory(ticker: string): Promise<{
  status: "ok" | "no_match" | "error";
  yahooSymbol: string;
  candles: DailyCandle[];
  error?: string;
}> {
  const yahooSymbol = toYahooSymbol(ticker);
  const period2 = Math.floor(Date.now() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol
  )}?period1=0&period2=${period2}&interval=1d&events=div%7Csplit`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (res.status === 404) {
        return {
          status: "no_match",
          yahooSymbol,
          candles: [],
          error: "لا يوجد تطابق لهذا الرمز في Yahoo Finance.",
        };
      }

      if (res.status === 429 || res.status >= 500) {
        if (attempt === 0) {
          await sleep(2000);
          continue;
        }
        return {
          status: "error",
          yahooSymbol,
          candles: [],
          error: `فشل مؤقت من Yahoo Finance (${res.status}).`,
        };
      }

      if (!res.ok) {
        return {
          status: "error",
          yahooSymbol,
          candles: [],
          error: `استجابة غير متوقعة من Yahoo Finance (${res.status}).`,
        };
      }

      const json = (await res.json()) as {
        chart?: { error?: { description?: string } | null; result?: unknown[] | null };
      };

      if (
        json?.chart?.error ||
        !json?.chart?.result ||
        json.chart.result.length === 0
      ) {
        return {
          status: "no_match",
          yahooSymbol,
          candles: [],
          error:
            json?.chart?.error?.description ??
            "لا يوجد تطابق لهذا السهم في Yahoo Finance.",
        };
      }

      const validated = validateYahooDailyPayload(json);
      if (!validated.ok) {
        return {
          status: "error",
          yahooSymbol,
          candles: [],
          error: validated.error,
        };
      }

      if (validated.candles.length === 0) {
        return {
          status: "no_match",
          yahooSymbol,
          candles: [],
          error: "لم تُرجع Yahoo Finance أي بيانات صالحة لهذا السهم.",
        };
      }

      return { status: "ok", yahooSymbol, candles: validated.candles };
    } catch (err) {
      if (attempt === 0) {
        await sleep(2000);
        continue;
      }
      return {
        status: "error",
        yahooSymbol,
        candles: [],
        error: err instanceof Error ? err.message : "خطأ شبكة أثناء الاتصال بـ Yahoo.",
      };
    }
  }

  return {
    status: "error",
    yahooSymbol,
    candles: [],
    error: "فشل مؤقت في جلب البيانات.",
  };
}
