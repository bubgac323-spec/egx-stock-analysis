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
  const upper = ticker.trim().toUpperCase();
  return YAHOO_SYMBOL_OVERRIDES[upper] ?? `${upper}.CA`;
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
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol
  )}?range=max&interval=1d&events=div%7Csplit`;

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

      if (json?.chart?.error || !json?.chart?.result || json.chart.result.length === 0) {
        return {
          status: "no_match",
          yahooSymbol,
          candles: [],
          error:
            json?.chart?.error?.description ??
            "لا يوجد تطابق لهذا السهم في Yahoo Finance.",
        };
      }

      const candles = parseYahooChart(json);
      if (candles.length === 0) {
        return {
          status: "no_match",
          yahooSymbol,
          candles: [],
          error: "لم تُرجع Yahoo Finance أي شموع صالحة لهذا السهم.",
        };
      }

      return { status: "ok", yahooSymbol, candles };
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
