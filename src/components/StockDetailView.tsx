"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, ArrowRight, Clock, Calendar } from "lucide-react";
import {
  INDICATOR_DESCRIPTIONS,
  type IndicatorSnapshot,
  type OhlcvCandle,
} from "@/lib/indicators";
import type { PlainAnalysisResult } from "@/lib/plain-analysis";
import type { StockSummaryItem } from "./MarketDashboard";
import { ClientDateTime, Num, Pct, Term } from "./Formatters";
import { formatDate, formatVolume } from "@/lib/format";

interface HistoryRow {
  date: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number | null;
  changePct: number | null;
}

function PriceChart({
  candles,
  storedCount,
}: {
  candles: OhlcvCandle[];
  storedCount: number;
}) {
  if (candles.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-600">
        {storedCount > 0
          ? `مفيش بيانات كفاية للرسم لسه، بس فيه ${storedCount} يوم مخزّن تحت في الجدول.`
          : "مفيش بيانات كفاية للرسم لسه."}
      </div>
    );
  }

  const closes = candles.map((c) => c.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const w = 640;
  const h = 200;
  const pad = 16;

  const points = closes
    .map((c, idx) => {
      const x = pad + (idx / (closes.length - 1)) * (w - pad * 2);
      const y = h - pad - ((c - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-52 w-full rounded-xl bg-slate-50"
        role="img"
        aria-label="رسم حركة السعر"
      >
        <polyline
          fill="none"
          stroke="#047857"
          strokeWidth="2.5"
          points={points}
        />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-slate-500">
        <span>
          أول يوم معروض: <ClientDateTime value={candles[0].timestamp} dateOnly />
        </span>
        <span>
          آخر يوم معروض:{" "}
          <ClientDateTime
            value={candles[candles.length - 1].timestamp}
            dateOnly
          />
        </span>
      </div>
    </div>
  );
}

export function StockDetailView({
  stock,
  dailyCandles,
  indicators,
  plainAnalysis,
  backfillStatus,
}: {
  stock: StockSummaryItem;
  dailyCandles: OhlcvCandle[];
  indicators: IndicatorSnapshot;
  plainAnalysis: PlainAnalysisResult;
  backfillStatus: string | null;
}) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalStoredDays, setTotalStoredDays] = useState(0);
  const [firstDate, setFirstDate] = useState<string | null>(null);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [topGains, setTopGains] = useState<string[]>([]);
  const [topDrops, setTopDrops] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [direction, setDirection] = useState<"all" | "up" | "down">("all");
  const [loadingHistory, setLoadingHistory] = useState(false);

  const pageSize = 50;

  useEffect(() => {
    setLoadingHistory(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      direction,
    });
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);

    fetch(`/api/stocks/${encodeURIComponent(stock.ticker)}/history?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setRows(Array.isArray(d.rows) ? d.rows : []);
        setTotal(Number(d.total) || 0);
        setTotalStoredDays(Number(d.totalStoredDays) || 0);
        setFirstDate(d.firstDate ?? null);
        setLastDate(d.lastDate ?? null);
        setTopGains(Array.isArray(d.topGainDates) ? d.topGainDates : []);
        setTopDrops(Array.isArray(d.topDropDates) ? d.topDropDates : []);
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [stock.ticker, page, fromDate, toDate, direction]);

  const applyQuickRange = (days: number | null) => {
    setPage(1);
    setToDate("");
    if (days === null) {
      setFromDate("");
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() - days);
    setFromDate(d.toISOString().slice(0, 10));
  };

  const exportHistoryCsv = () => {
    const header = "date,open,high,low,close,change,change_pct,volume";
    const csvRows = rows.map((r) =>
      [
        r.date,
        r.open,
        r.high,
        r.low,
        r.close,
        r.change ?? "",
        r.changePct !== null ? r.changePct.toFixed(2) : "",
        r.volume,
      ].join(",")
    );
    const blob = new Blob([[header, ...csvRows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${stock.ticker}-daily-history.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isUpToday = (stock.changePct ?? 0) >= 0;
  const hasNoYahooMatch = backfillStatus === "no_match" && dailyCandles.length === 0;

  return (
    <div className="space-y-6">
      {/* 1. Header: Arabic name, ticker, sector (omit if غير مصنّف), last update */}
      <div className="space-y-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          العودة للرئيسية
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">{stock.nameAr}</h1>
          <span className="rounded-lg bg-slate-200/80 px-2.5 py-0.5 text-xs font-bold text-slate-700">
            <bdi dir="ltr">{stock.ticker}</bdi>
          </span>
          {stock.sector && stock.sector !== "غير مصنّف" && (
            <span className="rounded-lg bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              {stock.sector}
            </span>
          )}
        </div>
        <p className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          آخر تحديث: <ClientDateTime value={stock.dataUpdatedAt} /> · تأخير{" "}
          <Num value={stock.delayMinutes} decimals={0} /> دقيقة
        </p>
      </div>

      {/* 2. Price Card: current price, today's change in EGP & %, day's range */}
      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:grid-cols-3">
        <div>
          <div className="text-xs text-slate-500">آخر سعر</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">
            <Num value={stock.lastPrice} />{" "}
            <span className="text-sm font-normal text-slate-500">
              {stock.currency}
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">تغيّر النهارده</div>
          <div
            className={`mt-1 text-xl font-bold ${
              isUpToday ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {stock.change !== null ? (
              <>
                <Num value={stock.change} /> ج.م (
                <Pct value={stock.changePct} />)
              </>
            ) : (
              <Pct value={stock.changePct} />
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">أدنى وأعلى سعر النهارده</div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            <Num value={stock.low} /> — <Num value={stock.high} />{" "}
            <span className="text-xs font-normal text-slate-500">ج.م</span>
          </div>
        </div>
      </section>

      {/* 3. Plain-language Summary Card */}
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-xs">
        <h2 className="text-base font-bold text-emerald-950">
          ملخص السهم بكلمات بسيطة
        </h2>

        {hasNoYahooMatch ? (
          <p className="mt-2 text-sm text-slate-800">
            مفيش عندنا تاريخ سعر للسهم ده لحد دلوقتي، بس بنعرض آخر سعر وبيانات
            اليوم.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {plainAnalysis.headline}
            </p>
            {plainAnalysis.shortHistoryWarning && (
              <p className="mt-2 rounded-xl bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-950">
                {plainAnalysis.shortHistoryWarning}
              </p>
            )}
            <ul className="mt-3 list-disc space-y-1.5 pr-5 text-sm leading-relaxed text-slate-800">
              {plainAnalysis.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-3 text-xs text-slate-600">{plainAnalysis.closingNote}</p>
      </section>

      {/* 4. Price Chart */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="mb-3 text-base font-bold text-slate-900">
          حركة السعر يوم بيوم (آخر ٣٦٥ يوم تداول)
        </h2>
        <PriceChart
          candles={dailyCandles}
          storedCount={totalStoredDays || dailyCandles.length}
        />
      </section>

      {/* 5. Day-by-day Price Table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-700" />
              <h2 className="text-base font-bold text-slate-900">
                تاريخ السعر يوم بيوم (
                <Num value={totalStoredDays} decimals={0} /> يوم)
              </h2>
            </div>
            {firstDate && lastDate && (
              <p className="mt-0.5 text-xs text-slate-500">
                من {formatDate(firstDate)} إلى {formatDate(lastDate)}
              </p>
            )}
          </div>

          {rows.length > 0 && (
            <button
              type="button"
              onClick={exportHistoryCsv}
              className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              <Download className="h-3.5 w-3.5" />
              تنزيل CSV
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => applyQuickRange(30)}
            className="min-h-9 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
          >
            آخر شهر
          </button>
          <button
            type="button"
            onClick={() => applyQuickRange(90)}
            className="min-h-9 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
          >
            3 أشهر
          </button>
          <button
            type="button"
            onClick={() => applyQuickRange(365)}
            className="min-h-9 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
          >
            سنة
          </button>
          <button
            type="button"
            onClick={() => applyQuickRange(null)}
            className="min-h-9 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
          >
            الكل
          </button>

          <input
            type="date"
            aria-label="من تاريخ"
            value={fromDate}
            onChange={(e) => {
              setPage(1);
              setFromDate(e.target.value);
            }}
            className="min-h-9 rounded-lg border border-slate-200 px-2 py-1"
          />
          <input
            type="date"
            aria-label="إلى تاريخ"
            value={toDate}
            onChange={(e) => {
              setPage(1);
              setToDate(e.target.value);
            }}
            className="min-h-9 rounded-lg border border-slate-200 px-2 py-1"
          />

          <select
            value={direction}
            onChange={(e) => {
              setPage(1);
              setDirection(e.target.value as "all" | "up" | "down");
            }}
            className="min-h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
          >
            <option value="all">كل الأيام</option>
            <option value="up">أيام الصعود فقط</option>
            <option value="down">أيام النزول فقط</option>
          </select>
        </div>

        {loadingHistory ? (
          <p className="mt-4 text-center text-xs text-slate-500">
            جارٍ تحميل تاريخ الأسعار...
          </p>
        ) : rows.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-600">
            {hasNoYahooMatch
              ? "مفيش عندنا تاريخ سعر للسهم ده لحد دلوقتي."
              : "لسه محمّلناش تاريخ الأسعار للسهم ده في النطاق ده."}
          </p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="py-2">التاريخ</th>
                    <th className="py-2">سعر الإغلاق</th>
                    <th className="py-2">التغير (ج.م)</th>
                    <th className="py-2">النسبة</th>
                    <th className="py-2">الافتتاح</th>
                    <th className="py-2">الأعلى</th>
                    <th className="py-2">الأدنى</th>
                    <th className="py-2">كمية التداول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => {
                    const isUp = (r.change ?? 0) > 0;
                    const isDown = (r.change ?? 0) < 0;
                    const isTopGain = topGains.includes(r.date);
                    const isTopDrop = topDrops.includes(r.date);
                    return (
                      <tr key={r.date} className="hover:bg-slate-50">
                        <td className="py-2 whitespace-nowrap">
                          {formatDate(r.date)}
                          {isTopGain && (
                            <span className="ms-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                              أكبر صعود
                            </span>
                          )}
                          {isTopDrop && (
                            <span className="ms-1.5 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800">
                              أكبر نزول
                            </span>
                          )}
                        </td>
                        <td className="py-2 font-semibold">
                          <Num value={r.close} />
                        </td>
                        <td
                          className={`py-2 font-medium ${
                            isUp
                              ? "text-emerald-700"
                              : isDown
                                ? "text-rose-700"
                                : "text-slate-500"
                          }`}
                        >
                          {r.change === null ? (
                            "-"
                          ) : (
                            <>
                              {isUp ? "▲ " : isDown ? "▼ " : ""}
                              <Num value={Math.abs(r.change)} />
                            </>
                          )}
                        </td>
                        <td
                          className={`py-2 font-medium ${
                            isUp
                              ? "text-emerald-700"
                              : isDown
                                ? "text-rose-700"
                                : "text-slate-500"
                          }`}
                        >
                          {r.changePct === null ? "-" : <Pct value={r.changePct} />}
                        </td>
                        <td className="py-2">
                          <Num value={r.open} />
                        </td>
                        <td className="py-2">
                          <Num value={r.high} />
                        </td>
                        <td className="py-2">
                          <Num value={r.low} />
                        </td>
                        <td className="py-2 text-slate-600">
                          {formatVolume(r.volume, true)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-xs">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="min-h-9 rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
                >
                  السابق
                </button>
                <span>
                  صفحة <Num value={page} decimals={0} /> من{" "}
                  <Num value={totalPages} decimals={0} />
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="min-h-9 rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* 6. Extra Stock Facts ("أرقام عن السهم") */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-bold text-slate-900">أرقام عن السهم</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">سعر الافتتاح اليوم</div>
            <div className="mt-1 text-base font-bold text-slate-900">
              <Num value={stock.open} /> ج.م
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">الإغلاق السابق</div>
            <div className="mt-1 text-base font-bold text-slate-900">
              <Num value={stock.prevClose} /> ج.م
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">كمية الأسهم اللي اتداولت اليوم</div>
            <div className="mt-1 text-base font-bold text-slate-900">
              {formatVolume(stock.volume, true)}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">أعلى سعر في السنة</div>
            <div className="mt-1 text-base font-bold text-slate-900">
              <Num value={plainAnalysis.facts.high52w} /> ج.م
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">أدنى سعر في السنة</div>
            <div className="mt-1 text-base font-bold text-slate-900">
              <Num value={plainAnalysis.facts.low52w} /> ج.م
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">السعر بيتحرك قد إيه (التذبذب)</div>
            <div className="mt-1 text-base font-bold text-slate-900">
              <Pct value={indicators.volatilityPct} signed={false} />
            </div>
          </div>
        </div>
      </section>

      {/* Calculated price numbers (plain labels + secondary technical terms) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-bold text-slate-900">
          أرقام محسوبة عن حركة السعر
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">
              قوة الحركة الأخيرة (<Term id="rsi">RSI 14</Term>)
            </div>
            <div className="mt-1 text-xl font-bold text-slate-900">
              <Num value={indicators.rsi14} />
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {INDICATOR_DESCRIPTIONS.rsi.beginner}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">
              متوسط السعر (<Term id="sma">SMA 20 / 50</Term>)
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              <bdi dir="ltr">SMA 20</bdi>: <Num value={indicators.sma20} /> |{" "}
              <bdi dir="ltr">SMA 50</bdi>: <Num value={indicators.sma50} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">
              تغيّر قوة الحركة (<Term id="macd">MACD</Term>)
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              <bdi dir="ltr">MACD</bdi>: <Num value={indicators.macd} /> | إشارة:{" "}
              <Num value={indicators.macdSignal} />
            </div>
          </div>
        </div>
      </section>

      <p className="text-center text-xs text-slate-500">
        تاريخ الأسعار اليومي من Yahoo Finance، وقد تختلف بعض الأرقام قليلاً عن
        أرقام Mansa، وبعض الأسهم قد لا يتوفر لها سجل كامل.
      </p>
    </div>
  );
}
