import "server-only";
import { db } from "@/db";
import { candles, stocks, syncLogs, type StockRow } from "@/db/schema";
import { asc, desc, eq, gte, sql } from "drizzle-orm";
import type { OhlcvCandle } from "./indicators";

export interface MarketStatus {
  dbConnected: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncMessage: string | null;
  requestsToday: number;
  requestsThisMonth: number;
  dailyLimit: number;
  monthlyLimit: number;
  delayMinutes: number;
}

export async function getMarketStatus(): Promise<MarketStatus> {
  try {
    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );

    const [latest] = await db
      .select()
      .from(syncLogs)
      .orderBy(desc(syncLogs.createdAt))
      .limit(1);

    const [todayAgg] = await db
      .select({
        total: sql<number>`coalesce(sum(${syncLogs.requestsUsed}), 0)::int`,
      })
      .from(syncLogs)
      .where(gte(syncLogs.createdAt, startOfDay));

    const [monthAgg] = await db
      .select({
        total: sql<number>`coalesce(sum(${syncLogs.requestsUsed}), 0)::int`,
      })
      .from(syncLogs)
      .where(gte(syncLogs.createdAt, startOfMonth));

    return {
      dbConnected: true,
      lastSyncAt: latest?.createdAt?.toISOString() ?? null,
      lastSyncStatus: latest?.status ?? null,
      lastSyncMessage: latest?.message ?? null,
      requestsToday: todayAgg?.total ?? 0,
      requestsThisMonth: monthAgg?.total ?? 0,
      dailyLimit: 100,
      monthlyLimit: 1500,
      delayMinutes: 30,
    };
  } catch {
    return {
      dbConnected: false,
      lastSyncAt: null,
      lastSyncStatus: "db_unavailable",
      lastSyncMessage: "قاعدة البيانات غير متصلة حالياً.",
      requestsToday: 0,
      requestsThisMonth: 0,
      dailyLimit: 100,
      monthlyLimit: 1500,
      delayMinutes: 30,
    };
  }
}

export async function listStocks(): Promise<StockRow[]> {
  try {
    return await db.select().from(stocks).orderBy(asc(stocks.ticker));
  } catch {
    return [];
  }
}

export async function getStockByTicker(ticker: string): Promise<StockRow | null> {
  try {
    const [row] = await db
      .select()
      .from(stocks)
      .where(eq(stocks.ticker, ticker.toUpperCase()))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

export async function getCandlesForTicker(
  ticker: string,
  timeframe = "30m"
): Promise<OhlcvCandle[]> {
  try {
    const rows = await db
      .select()
      .from(candles)
      .where(eq(candles.ticker, ticker.toUpperCase()))
      .orderBy(asc(candles.timestamp));

    return rows
      .filter((r) => r.timeframe === timeframe)
      .map((r) => ({
        timestamp: r.timestamp.toISOString(),
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
      }));
  } catch {
    return [];
  }
}
