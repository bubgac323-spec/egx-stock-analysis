"use client";

import Link from "next/link";
import { Download, ArrowRight, Clock } from "lucide-react";
import { useInvestorLevel } from "./InvestorLevelProvider";
import {
  INDICATOR_DESCRIPTIONS,
  type IndicatorSnapshot,
  type OhlcvCandle,
} from "@/lib/indicators";
import type { StockSummaryItem } from "./MarketDashboard";

function fmt(n: number | null | undefined, d = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("ar-EG", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function PriceChart({ candles }: { candles: OhlcvCandle[] }) {
  if (candles.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-600">
        لا توجد شموع 30 دقيقة كافية لرسم المخطط حالياً ({candles.length} شمعة مخزنة).
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
        <span>أول شمعة: {new Date(candles[0].timestamp).toLocaleString("ar-EG")}</span>
        <span>آخر شمعة: {new Date(candles[candles.length - 1].timestamp).toLocaleString("ar-EG")}</span>
      </div>
    </div>
  );
}

export function StockDetailView({
  stock,
  candles,
  indicators,
}: {
  stock: StockSummaryItem;
  candles: OhlcvCandle[];
  indicators: IndicatorSnapshot;
}) {
  const { level } = useInvestorLevel();

  const exportCandlesCsv = () => {
    const header = "timestamp,open,high,low,close,volume";
    const rows = candles.map((c) =>
      [c.timestamp, c.open, c.high, c.low, c.close, c.volume].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${stock.ticker}-30m-candles.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
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
            {stock.ticker} — {stock.nameAr}
          </h1>
          <p className="text-xs text-slate-500">
            القطاع: {stock.sector} · العملة: {stock.currency}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left">
          <div className="text-2xl font-bold text-slate-900">
            {fmt(stock.lastPrice)} {stock.currency}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            تأخير {stock.delayMinutes} دقيقة ·{" "}
            {stock.dataUpdatedAt
              ? new Date(stock.dataUpdatedAt).toLocaleString("ar-EG")
              : "غير متاح"}
          </div>
        </div>
      </div>

      {/* Chart */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            شموع 30 دقيقة ({candles.length} شمعة مخزنة)
          </h2>
          {level === "expert" && candles.length > 0 && (
            <button
              type="button"
              onClick={exportCandlesCsv}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white"
            >
              <Download className="h-3.5 w-3.5" />
              تصدير الشموع CSV
            </button>
          )}
        </div>
        <PriceChart candles={candles} />
      </section>

      {/* Technical Indicators (Tool 3) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h2 className="text-base font-bold text-slate-900">
          المؤشرات الفنية المحسوبة (وصفية فقط)
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">
              {INDICATOR_DESCRIPTIONS.rsi.name}
            </div>
            <div className="mt-1 text-xl font-bold text-slate-900">
              {fmt(indicators.rsi14)}
            </div>
            {level === "beginner" && (
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {INDICATOR_DESCRIPTIONS.rsi.beginner}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">
              {INDICATOR_DESCRIPTIONS.sma.name}
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              SMA 20: {fmt(indicators.sma20)} | SMA 50: {fmt(indicators.sma50)}
            </div>
            {level === "beginner" && (
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {INDICATOR_DESCRIPTIONS.sma.beginner}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">
              {INDICATOR_DESCRIPTIONS.macd.name}
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              MACD: {fmt(indicators.macd)} | إشارة: {fmt(indicators.macdSignal)}
            </div>
            {level === "beginner" && (
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {INDICATOR_DESCRIPTIONS.macd.beginner}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">
              {INDICATOR_DESCRIPTIONS.bollinger.name}
            </div>
            <div className="mt-1 text-xs font-bold text-slate-900">
              أعلى: {fmt(indicators.bollingerUpper)} | وسط: {fmt(indicators.bollingerMiddle)} | أدنى: {fmt(indicators.bollingerLower)}
            </div>
            {level === "beginner" && (
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {INDICATOR_DESCRIPTIONS.bollinger.beginner}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">
              {INDICATOR_DESCRIPTIONS.volume.name}
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              نسبة الحجم للمتوسط: {fmt(indicators.volumeRatio)}x
            </div>
            {level === "beginner" && (
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {INDICATOR_DESCRIPTIONS.volume.beginner}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">
              التذبذب التاريخي (الانحراف المعياري)
            </div>
            <div className="mt-1 text-xl font-bold text-slate-900">
              {fmt(indicators.volatilityPct)}%
            </div>
            <p className="mt-2 text-xs text-slate-600">
              يقيس تشتت العوائد التاريخية بين الشموع المخزنة.
            </p>
          </div>
        </div>
      </section>

      {/* Expert raw candles table */}
      {level === "expert" && candles.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">
            جدول الشموع الخام (آخر 50 شمعة)
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2">الوقت</th>
                  <th className="py-2">افتتاح</th>
                  <th className="py-2">أعلى</th>
                  <th className="py-2">أدنى</th>
                  <th className="py-2">إغلاق</th>
                  <th className="py-2">الحجم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candles.slice(-50).reverse().map((c) => (
                  <tr key={c.timestamp}>
                    <td className="py-1.5">{new Date(c.timestamp).toLocaleString("ar-EG")}</td>
                    <td className="py-1.5">{fmt(c.open)}</td>
                    <td className="py-1.5">{fmt(c.high)}</td>
                    <td className="py-1.5">{fmt(c.low)}</td>
                    <td className="py-1.5 font-semibold">{fmt(c.close)}</td>
                    <td className="py-1.5">{fmt(c.volume, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
