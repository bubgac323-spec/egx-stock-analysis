"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Award, BookOpen, RefreshCw } from "lucide-react";
import {
  DEFAULT_RANKING_WEIGHTS,
  type RankedStockItem,
  type RankingWeights,
} from "@/lib/ranking";
import { STRATEGY_LABELS, type StrategyKey } from "@/lib/backtest";
import { RANKING_DISCLAIMER } from "@/lib/content-policy";

export default function RankingPage() {
  const [strategy, setStrategy] = useState<StrategyKey>("sma_crossover");
  const [weights, setWeights] = useState<RankingWeights>(DEFAULT_RANKING_WEIGHTS);
  const [items, setItems] = useState<RankedStockItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRanking = async (w: RankingWeights, s: StrategyKey) => {
    setLoading(true);
    try {
      const res = await fetch("/api/ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...w, strategy: s }),
      });
      const data = await res.json();
      if (Array.isArray(data.items)) setItems(data.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRanking(weights, strategy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">{RANKING_DISCLAIMER}</p>
            <p className="mt-1 text-xs">
              كل سهم في الترتيب مرفق بإحصاءاته التاريخية الكاملة ومستوى الثقة وتحذير
              العينة الصغيرة.{" "}
              <Link
                href="/ranking/methodology"
                className="font-semibold underline hover:text-amber-700"
              >
                اقرأ: كيف يعمل الترتيب ونقاط ضعفه
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-700" />
            <h1 className="text-xl font-bold text-slate-900">
              الترتيب التاريخي الشفاف للأسهم
            </h1>
          </div>
          <Link
            href="/ranking/methodology"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <BookOpen className="h-3.5 w-3.5" />
            كيف يعمل الترتيب؟
          </Link>
        </div>

        {/* User-adjustable weights */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              القاعدة التاريخية
            </label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as StrategyKey)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
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
              وزن نسبة النجاح ({weights.winRateWeight})
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.winRateWeight}
              onChange={(e) =>
                setWeights((w) => ({ ...w, winRateWeight: Number(e.target.value) }))
              }
              className="mt-2 w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              وزن متوسط العائد ({weights.avgReturnWeight})
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.avgReturnWeight}
              onChange={(e) =>
                setWeights((w) => ({ ...w, avgReturnWeight: Number(e.target.value) }))
              }
              className="mt-2 w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              وزن انخفاض التراجع ({weights.drawdownWeight})
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.drawdownWeight}
              onChange={(e) =>
                setWeights((w) => ({ ...w, drawdownWeight: Number(e.target.value) }))
              }
              className="mt-2 w-full"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => loadRanking(weights, strategy)}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              إعادة الحساب
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="mt-6">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
              لا توجد أسهم تمتلك شموعاً تاريخية كافية (5 شموع على الأقل) لحساب الترتيب
              التاريخي بعد. لا يعرض النظام أي ترتيب بلا إحصاءات تاريخية محسوبة.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="py-2">#</th>
                    <th className="py-2">السهم</th>
                    <th className="py-2">الدرجة الوصفية</th>
                    <th className="py-2">عدد الحالات</th>
                    <th className="py-2">نسبة النجاح</th>
                    <th className="py-2">متوسط العائد</th>
                    <th className="py-2">أقصى تراجع</th>
                    <th className="py-2">الثقة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={item.ticker}>
                      <td className="py-2.5 font-bold">{idx + 1}</td>
                      <td className="py-2.5">
                        <Link
                          href={`/stocks/${item.ticker}`}
                          className="font-bold text-slate-900 hover:text-emerald-700"
                        >
                          {item.ticker}
                        </Link>
                        <div className="text-[11px] text-slate-500">{item.nameAr}</div>
                      </td>
                      <td className="py-2.5 font-bold text-emerald-800">{item.score}</td>
                      <td className="py-2.5">
                        {item.historicalStats.sampleSize}
                        {item.historicalStats.smallSampleWarning && (
                          <span className="mr-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900">
                            عينة صغيرة
                          </span>
                        )}
                      </td>
                      <td className="py-2.5">{item.historicalStats.winRate}%</td>
                      <td className="py-2.5">{item.historicalStats.avgReturnPct}%</td>
                      <td className="py-2.5">{item.historicalStats.maxDrawdownPct}%</td>
                      <td className="py-2.5">{item.historicalStats.confidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
