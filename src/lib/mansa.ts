import "server-only";

export const MANSA_BASE_URL = "https://mansaapi.com";
export const MANSA_FREE_DAILY_LIMIT = 100;
export const MANSA_FREE_MONTHLY_LIMIT = 1500;
export const MANSA_DEFAULT_DELAY_MINUTES = 30;
export const MANSA_TERMS_URL = "https://mansaapi.com/terms";

export interface MansaStockQuote {
  ticker: string;
  name: string;
  sector: string;
  currency: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  prevClose: number | null;
  timestamp: string | null;
}

function getApiKey(): string {
  const key = process.env.MANSA_API_KEY;
  if (!key) {
    throw new Error("متغير البيئة MANSA_API_KEY غير مضبوط على الخادم.");
  }
  return key;
}

function toNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

let warnedMissingSector = false;

function extractSector(raw: Record<string, unknown>): string {
  const profile = raw.profile as Record<string, unknown> | undefined;
  const candidates = [
    raw.sector_ar,
    raw.sector,
    raw.sector_name,
    raw.industry,
    raw.industry_name,
    raw.gics_sector,
    profile?.sector,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim() !== "" && c.trim() !== "غير مصنّف") {
      return c.trim();
    }
  }
  if (!warnedMissingSector) {
    warnedMissingSector = true;
    console.warn(
      "[mansa] لم يُعثر على حقل قطاع في استجابة السهم. المفاتيح المتاحة:",
      Object.keys(raw)
    );
  }
  return "غير مصنّف";
}

function normalizeQuote(raw: Record<string, unknown>): MansaStockQuote | null {
  const ticker = String(raw.ticker ?? raw.symbol ?? "").trim().toUpperCase();
  if (!ticker) return null;

  return {
    ticker,
    name: String(raw.name ?? raw.company_name ?? ticker).trim(),
    sector: extractSector(raw),
    currency: String(raw.currency ?? "EGP").trim(),
    price: toNum(raw.price ?? raw.last_price ?? raw.close),
    change: toNum(raw.change ?? raw.price_change),
    changePct: toNum(raw.change_pct ?? raw.percent_change),
    volume: toNum(raw.volume),
    open: toNum(raw.open),
    high: toNum(raw.high),
    low: toNum(raw.low),
    prevClose: toNum(raw.prev_close ?? raw.previous_close),
    timestamp:
      typeof raw.updated_at === "string"
        ? raw.updated_at
        : typeof raw.timestamp === "string"
          ? raw.timestamp
          : null,
  };
}

async function mansaFetch(path: string): Promise<unknown> {
  const apiKey = getApiKey();
  const res = await fetch(`${MANSA_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `فشل طلب Mansa API (${res.status} ${res.statusText}) على ${path}: ${body.slice(0, 200)}`
    );
  }
  return res.json();
}

export async function fetchEgxStocks(limit = 200, offset = 0): Promise<MansaStockQuote[]> {
  const payload = (await mansaFetch(
    `/api/v1/markets/exchanges/EGX/stocks?limit=${limit}&offset=${offset}`
  )) as Record<string, unknown>;

  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.data)
      ? payload.data
      : Array.isArray((payload.data as Record<string, unknown> | undefined)?.stocks)
        ? ((payload.data as Record<string, unknown>).stocks as unknown[])
        : [];

  return rows
    .map((r) => normalizeQuote(r as Record<string, unknown>))
    .filter((q): q is MansaStockQuote => q !== null);
}

export async function fetchEgxStock(ticker: string): Promise<MansaStockQuote | null> {
  const clean = encodeURIComponent(ticker.trim().toUpperCase());
  const payload = (await mansaFetch(
    `/api/v1/markets/exchanges/EGX/stocks/${clean}`
  )) as Record<string, unknown>;

  const item =
    (payload.data as Record<string, unknown> | undefined) ?? payload;
  return normalizeQuote(item);
}
