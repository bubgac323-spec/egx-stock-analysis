import {
  pgTable,
  serial,
  text,
  doublePrecision,
  integer,
  timestamp,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const stocks = pgTable("stocks", {
  ticker: text("ticker").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  sector: text("sector").notNull().default("غير مصنّف"),
  currency: text("currency").notNull().default("EGP"),
  lastPrice: doublePrecision("last_price"),
  change: doublePrecision("change"),
  changePct: doublePrecision("change_pct"),
  volume: doublePrecision("volume"),
  open: doublePrecision("open"),
  high: doublePrecision("high"),
  low: doublePrecision("low"),
  prevClose: doublePrecision("prev_close"),
  delayMinutes: integer("delay_minutes").notNull().default(30),
  dataUpdatedAt: timestamp("data_updated_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const candles = pgTable(
  "candles",
  {
    id: serial("id").primaryKey(),
    ticker: text("ticker")
      .notNull()
      .references(() => stocks.ticker, { onDelete: "cascade" }),
    timeframe: text("timeframe").notNull().default("30m"),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    open: doublePrecision("open").notNull(),
    high: doublePrecision("high").notNull(),
    low: doublePrecision("low").notNull(),
    close: doublePrecision("close").notNull(),
    volume: doublePrecision("volume").notNull().default(0),
  },
  (table) => [
    uniqueIndex("candles_ticker_tf_ts_idx").on(
      table.ticker,
      table.timeframe,
      table.timestamp
    ),
    index("candles_ticker_tf_idx").on(table.ticker, table.timeframe),
  ]
);

export const backtestResults = pgTable(
  "backtest_results",
  {
    id: serial("id").primaryKey(),
    ticker: text("ticker")
      .notNull()
      .references(() => stocks.ticker, { onDelete: "cascade" }),
    strategyKey: text("strategy_key").notNull(),
    paramsJson: text("params_json").notNull(),
    timeframe: text("timeframe").notNull().default("30m"),
    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    totalTrades: integer("total_trades").notNull(),
    winRate: doublePrecision("win_rate").notNull(),
    avgWinPct: doublePrecision("avg_win_pct").notNull(),
    avgLossPct: doublePrecision("avg_loss_pct").notNull(),
    avgReturnPct: doublePrecision("avg_return_pct").notNull(),
    totalReturnPct: doublePrecision("total_return_pct").notNull(),
    buyAndHoldPct: doublePrecision("buy_and_hold_pct").notNull(),
    maxDrawdownPct: doublePrecision("max_drawdown_pct").notNull(),
    outOfSampleWinRate: doublePrecision("out_of_sample_win_rate"),
    outOfSampleReturnPct: doublePrecision("out_of_sample_return_pct"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("backtest_ticker_strategy_idx").on(table.ticker, table.strategyKey),
  ]
);

export const syncLogs = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  source: text("source").notNull().default("mansa"),
  endpoint: text("endpoint").notNull(),
  status: text("status").notNull(), // 'success' | 'error'
  recordsCount: integer("records_count").notNull().default(0),
  requestsUsed: integer("requests_used").notNull().default(1),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const backfillProgress = pgTable(
  "backfill_progress",
  {
    ticker: text("ticker")
      .primaryKey()
      .references(() => stocks.ticker, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // pending | done | no_match | error
    yahooSymbol: text("yahoo_symbol"),
    firstDate: date("first_date"),
    lastDate: date("last_date"),
    candlesCount: integer("candles_count").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    message: text("message"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("backfill_progress_status_idx").on(table.status)]
);

export type StockRow = typeof stocks.$inferSelect;
export type CandleRow = typeof candles.$inferSelect;
export type BacktestResultRow = typeof backtestResults.$inferSelect;
export type SyncLogRow = typeof syncLogs.$inferSelect;
export type BackfillProgressRow = typeof backfillProgress.$inferSelect;
