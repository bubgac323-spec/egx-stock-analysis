"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, ArrowRight, Clock, Calendar } from "lucide-react";
import { useInvestorLevel } from "./InvestorLevelProvider";
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

function PriceChart({ candles }: { candles: OhlcvCandle[] }) {
  if (candles.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-600">
        لا توجد بيانات كافية لرسم المخطط حالياً ({candles.length} شمعة مخزنة).
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
        aria-label="مخطط حركة السعر التاريخية"
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
          أول يوم معروض:{" "}
          <ClientDateTime value={candles[0].timestamp} dateOnly />
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
  intradayCandles,
  indicators,
  plainAnalysis,
}: {
  stock: StockSummaryItem;
  dailyCandles: OhlcvCandle[];
  intradayCandles: OhlcvCandle[];
  indicators: IndicatorSnapshot;
  plainAnalysis: PlainAnalysisResult;
}) {
  const { level } = useInvestorLevel();
  const chartCandles = dailyCandles.length >= 2 ? dailyCandles : intradayCandles;

  // Daily History Log state (Section 3)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            العودة إلى لوحة السوق
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            <bdi dir="ltr">{stock.ticker}</bdi> — {stock.nameAr}
          </h1>
          <p className="text-xs text-slate-500">
            القطاع: {stock.sector} · العملة: {stock.currency}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left">
          <div className="text-xs text-slate-500">
            {level === "beginner" ? "آخر سعر" : "السعر الحالي"}
          </div>
          <div className="text-2xl font-bold text-slate-900">
            <Num value={stock.lastPrice} /> {stock.currency}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            تأخير <Num value={stock.delayMinutes} decimals={0} /> دقيقة ·{" "}
            <ClientDateTime value={stock.dataUpdatedAt} />
          </div>
        </div>
      </div>

      {/* Section 2: Plain Analysis Card — top of stock page in ALL modes */}
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-emerald-950">
            ملخص السهم بكلمات بسيطة
          </h2>
          {level !== "beginner" && (
            <a
              href="#technical-details"
              className="text-xs font-semibold text-emerald-800 underline"
            >
              عرض التفاصيل الفنية
            </a>
          )}
        </div>

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

        <p className="mt-3 text-xs text-slate-600">{plainAnalysis.closingNote}</p>
      </section>

      {/* Price Chart */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {level === "beginner"
                ? "كيف تحرك سعر السهم خلال الفترة الأخيرة؟"
                : `مخطط السعر (${dailyCandles.length >= 2 ? "آخر سنة يومياً" : "شموع 30 دقيقة"})`}
            </h2>
            {level === "beginner" && (
              <p className="text-xs text-slate-500">
                ماذا يعني هذا؟ الخط الأخضر يوضح مسار سعر الإغلاق من الأقدم إلى الأحدث.
              </p>
            )}
          </div>
        </div>
        <PriceChart candles={chartCandles} />
      </section>

      {/* Section 3: Daily History Log */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-700" />
              <h2 className="text-base font-bold text-slate-900">
                سجل الأيام ({totalStoredDays > 0 ? <Num value={totalStoredDays} decimals={0} /> : "٠"} يوم تداول)
              </h2>
            </div>
            {firstDate && lastDate && (
              <p className="mt-0.5 text-xs text-slate-500">
                من {formatDate(firstDate)} إلى {formatDate(lastDate)}
              </p>
            )}
          </div>

          {level === "expert" && rows.length > 0 && (
            <button
              type="button"
              onClick={exportHistoryCsv}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white"
            >
              <Download className="h-3.5 w-3.5" />
              تصدير CSV
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => applyQuickRange(30)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
          >
            آخر شهر
          </button>
          <button
            type="button"
            onClick={() => applyQuickRange(90)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
          >
            3 أشهر
          </button>
          <button
            type="button"
            onClick={() => applyQuickRange(365)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
          >
            سنة
          </button>
          <button
            type="button"
            onClick={() => applyQuickRange(null)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
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
            className="rounded-lg border border-slate-200 px-2 py-1"
          />
          <input
            type="date"
            aria-label="إلى تاريخ"
            value={toDate}
            onChange={(e) => {
              setPage(1);
              setToDate(e.target.value);
            }}
            className="rounded-lg border border-slate-200 px-2 py-1"
          />

          <select
            value={direction}
            onChange={(e) => {
              setPage(1);
              setDirection(e.target.value as "all" | "up" | "down");
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
          >
            <option value="all">كل الأيام</option>
            <option value="up">أيام الصعود فقط</option>
            <option value="down">أيام النزول فقط</option>
          </select>
        </div>

        {loadingHistory ? (
          <p className="mt-4 text-center text-xs text-slate-500">
            جارٍ تحميل سجل الأيام...
          </p>
        ) : rows.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-600">
            لا توجد بيانات يومية مخزنة في هذا النطاق بعد.
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
                    <th className="py-2">نسبة التغير</th>
                    {level !== "beginner" && (
                      <>
                        <th className="py-2">الافتتاح</th>
                        <th className="py-2">الأعلى</th>
                        <th className="py-2">الأدنى</th>
                      </>
                    )}
                    <th className="py-2">
                      {level === "beginner" ? "كمية التداول" : "الحجم"}
                    </th>
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
                            <span className="mr-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                              أكبر صعود
                            </span>
                          )}
                          {isTopDrop && (
                            <span className="mr-1.5 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800">
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
                        {level !== "beginner" && (
                          <>
                            <td className="py-2">
                              <Num value={r.open} />
                            </td>
                            <td className="py-2">
                              <Num value={r.high} />
                            </td>
                            <td className="py-2">
                              <Num value={r.low} />
                            </td>
                          </>
                        )}
                        <td className="py-2 text-slate-600">
                          {formatVolume(r.volume, level === "beginner")}
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
                  className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
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
                  className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Technical Indicators (Hidden raw jargon in Beginner mode; shown in Intermediate & Expert) */}
      {level !== "beginner" && (
        <section
          id="technical-details"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
        >
          <h2 className="text-base font-bold text-slate-900">
            المؤشرات الفنية المحسوبة (وصفية فقط)
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-600">
                <Term id="rsi">RSI 14</Term> — مؤشر القوة النسبية
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
                <Term id="sma">SMA 20 / 50</Term> — المتوسطات البسيطة
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900">
                <bdi dir="ltr">SMA 20</bdi>: <Num value={indicators.sma20} /> |{" "}
                <bdi dir="ltr">SMA 50</bdi>: <Num value={indicators.sma50} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-600">
                <Term id="macd">MACD (12, 26, 9)</Term>
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900">
                <bdi dir="ltr">MACD</bdi>: <Num value={indicators.macd} /> | إشارة:{" "}
                <Num value={indicators.macdSignal} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-600">
                <Term id="bollinger">Bollinger Bands</Term>
              </div>
              <div className="mt-1 text-xs font-bold text-slate-900">
                أعلى: <Num value={indicators.bollingerUpper} /> | وسط:{" "}
                <Num value={indicators.bollingerMiddle} /> | أدنى:{" "}
                <Num value={indicators.bollingerLower} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-600">
                <Term id="volume-ratio">نسبة الحجم للمتوسط</Term>
              </div>
              <div className="mt-1 text-sm font-bold text-slate-900">
                <Num value={indicators.volumeRatio} />x
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-600">
                <Term id="volatility">التذبذب التاريخي</Term>
              </div>
              <div className="mt-1 text-xl font-bold text-slate-900">
                <Pct value={indicators.volatilityPct} signed={false} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Yahoo Finance attribution note (Section 1.9) */}
      <p className="text-center text-xs text-slate-500">
        السجل التاريخي من Yahoo Finance، قد تختلف بعض الأرقام قليلاً عن أرقام Mansa،
        وبعض الأسهم قد لا يتوفر لها سجل كامل.
      </p>
    </div>
  );
}
