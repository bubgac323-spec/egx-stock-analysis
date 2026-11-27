"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Play } from "lucide-react";
import { useInvestorLevel } from "@/components/InvestorLevelProvider";
import {
  STRATEGY_LABELS,
  type BacktestSummary,
  type StrategyKey,
} from "@/lib/backtest";
import { PAST_PERFORMANCE_NOTE } from "@/lib/content-policy";
import type { StockSummaryItem } from "@/components/MarketDashboard";

export default function BacktestPage() {
  const { level } = useInvestorLevel();
  const [stocks, setStocks] = useState<StockSummaryItem[]>([]);
  const [ticker, setTicker] = useState("");
  const [strategy, setStrategy] = useState<StrategyKey>("sma_crossover");
  const [fastPeriod, setFastPeriod] = useState("10");
  const [slowPeriod, setSlowPeriod] = useState("25");
  const [rsiBuyBelow, setRsiBuyBelow] = useState("30");
  const [rsiSellAbove, setRsiSellAbove] = useState("70");
  // Empty by default per requirements
  const [commissionPct, setCommissionPct] = useState("");
  const [feeFixed, setFeeFixed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    ticker: string;
    stockName: string;
    candleCount: number;
    result: BacktestSummary;
  } | null>(null);

  useEffect(() => {
    fetch("/api/stocks")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.stocks)) {
          setStocks(d.stocks);
          if (d.stocks.length > 0) setTicker(d.stocks[0].ticker);
        }
      })
      .catch(() => {});
  }, []);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          strategy,
          fastPeriod: Number(fastPeriod) || 10,
          slowPeriod: Number(slowPeriod) || 25,
          rsiBuyBelow: Number(rsiBuyBelow) || 30,
          rsiSellAbove: Number(rsiSellAbove) || 70,
          commissionPct: commissionPct === "" ? 0 : Number(commissionPct),
          feeFixed: feeFixed === "" ? 0 : Number(feeFixed),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "تعذّر تشغيل الاختبار.");
      } else {
        setResult(data);
      }
    } catch {
      setError("حدث خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">{PAST_PERFORMANCE_NOTE}</p>
            <p className="mt-0.5 text-xs">
              تُحسب جميع النتائج من الشموع المخزنة فعلياً في قاعدة البيانات. يُفصل
              الاختبار إلى فترة تدريب (70%) وفترة خارج العينة (30%) عند توفر شموع
              كافية للتحذير من الإفراط في الملاءمة (Overfitting).
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900">
          الاختبار التاريخي للاستراتيجيات (Backtest)
        </h1>

        {stocks.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
            لا توجد أسهم أو شموع تاريخية مخزنة في قاعدة البيانات بعد. عند مزامنة
            البيانات من Mansa API ستتمكن من اختيار أي سهم وتشغيل الاختبار التاريخي
            عليه مباشرة.
          </p>
        ) : (
          <form onSubmit={handleRun} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">السهم</label>
              <select
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {stocks.map((s) => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker} — {s.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">القاعدة المختبَرة</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as StrategyKey)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {(Object.keys(STRATEGY_LABELS) as StrategyKey[]).map((k) => (
                  <option key={k} value={k}>
                    {STRATEGY_LABELS[k].title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                نسبة العمولة % للطرف الواحد (اختياري)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
                placeholder="فارغ افتراضياً — أدخل النسبة"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                رسوم ثابتة للطرف الواحد ج.م (اختياري)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={feeFixed}
                onChange={(e) => setFeeFixed(e.target.value)}
                placeholder="فارغ افتراضياً — أدخل الرسوم"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            {level === "expert" && strategy === "sma_crossover" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">المتوسط السريع</label>
                  <input
                    type="number"
                    min="2"
                    value={fastPeriod}
                    onChange={(e) => setFastPeriod(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">المتوسط البطيء</label>
                  <input
                    type="number"
                    min="5"
                    value={slowPeriod}
                    onChange={(e) => setSlowPeriod(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}

            {level === "expert" && strategy === "rsi_oversold" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">دخول RSI تحت</label>
                  <input
                    type="number"
                    value={rsiBuyBelow}
                    onChange={(e) => setRsiBuyBelow(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">خروج RSI فوق</label>
                  <input
                    type="number"
                    value={rsiSellAbove}
                    onChange={(e) => setRsiSellAbove(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading || !ticker}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {loading ? "جارٍ الحساب..." : "تشغيل الاختبار التاريخي"}
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        )}
      </section>

      {result && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              نتائج {result.ticker} ({result.candleCount} شمعة)
            </h2>
            <span className="text-xs text-slate-500">
              {PAST_PERFORMANCE_NOTE}
            </span>
          </div>

          {result.result.smallSampleWarning && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
              تحذير: العينة صغيرة ({result.result.totalTrades} صفقة — أقل من 30 صفقة)
              والنتيجة غير موثوقة إحصائياً.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="عدد الصفقات" value={`${result.result.totalTrades}`} />
            <StatCard
              label="نسبة النجاح / الفشل"
              value={`${result.result.winRate}% / ${result.result.lossRate}%`}
            />
            <StatCard
              label="متوسط الربح / الخسارة"
              value={`+${result.result.avgWinPct}% / ${result.result.avgLossPct}%`}
            />
            <StatCard
              label="أقصى تراجع (Max Drawdown)"
              value={`${result.result.maxDrawdownPct}%`}
            />
            <StatCard
              label="العائد التراكمي للقاعدة"
              value={`${result.result.totalReturnPct}%`}
            />
            <StatCard
              label="الاحتفاظ بالسهم (Buy & Hold)"
              value={`${result.result.buyAndHoldPct}%`}
            />
            {result.result.inSample && (
              <StatCard
                label="فترة التدريب (70%)"
                value={`نجاح ${result.result.inSample.winRate}% | عائد ${result.result.inSample.totalReturnPct}%`}
              />
            )}
            {result.result.outOfSample && (
              <StatCard
                label="خارج العينة (30%)"
                value={`نجاح ${result.result.outOfSample.winRate}% | عائد ${result.result.outOfSample.totalReturnPct}%`}
              />
            )}
          </div>

          {result.result.trades.length > 0 && (
            <div className="overflow-x-auto">
              <h3 className="mb-2 text-sm font-bold text-slate-800">
                تفاصيل كل صفقة ({result.result.trades.length})
              </h3>
              <table className="w-full text-right text-xs">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2">#</th>
                    <th className="py-2">الدخول</th>
                    <th className="py-2">سعر الدخول</th>
                    <th className="py-2">الخروج</th>
                    <th className="py-2">سعر الخروج</th>
                    <th className="py-2">الصافي %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.result.trades.map((t, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5">{idx + 1}</td>
                      <td className="py-1.5">{new Date(t.entryTimestamp).toLocaleString("ar-EG")}</td>
                      <td className="py-1.5">{t.entryPrice}</td>
                      <td className="py-1.5">{new Date(t.exitTimestamp).toLocaleString("ar-EG")}</td>
                      <td className="py-1.5">{t.exitPrice}</td>
                      <td
                        className={`py-1.5 font-semibold ${
                          t.netReturnPct >= 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {t.netReturnPct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-base font-bold text-slate-900">{value}</div>
    </div>
  );
}
