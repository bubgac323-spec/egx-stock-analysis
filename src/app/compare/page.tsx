"use client";

import { useEffect, useState } from "react";
import { GitCompare } from "lucide-react";
import type { StockSummaryItem } from "@/components/MarketDashboard";

export default function ComparePage() {
  const [stocks, setStocks] = useState<StockSummaryItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/stocks")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.stocks)) setStocks(d.stocks);
      })
      .catch(() => {});
  }, []);

  const toggle = (ticker: string) => {
    setSelected((prev) => {
      if (prev.includes(ticker)) return prev.filter((t) => t !== ticker);
      if (prev.length >= 4) return prev;
      return [...prev, ticker];
    });
  };

  const chosen = stocks.filter((s) => selected.includes(s.ticker));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-emerald-700" />
          <h1 className="text-xl font-bold text-slate-900">
            مقارنة الأسهم (حتى 4 أسهم جنباً إلى جنب)
          </h1>
        </div>

        {stocks.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
            لا توجد أسهم مخزنة في قاعدة البيانات بعد لإجراء المقارنة.
          </p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {stocks.slice(0, 30).map((s) => {
                const active = selected.includes(s.ticker);
                return (
                  <button
                    key={s.ticker}
                    type="button"
                    onClick={() => toggle(s.ticker)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium ${
                      active
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    {s.ticker}
                  </button>
                );
              })}
            </div>

            {chosen.length > 0 && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="py-2">المعيار</th>
                      {chosen.map((s) => (
                        <th key={s.ticker} className="py-2 font-bold text-slate-900">
                          {s.ticker}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 text-xs text-slate-500">الاسم</td>
                      {chosen.map((s) => (
                        <td key={s.ticker} className="py-2">{s.nameAr}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 text-xs text-slate-500">القطاع</td>
                      {chosen.map((s) => (
                        <td key={s.ticker} className="py-2">{s.sector}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 text-xs text-slate-500">السعر</td>
                      {chosen.map((s) => (
                        <td key={s.ticker} className="py-2 font-semibold">{s.lastPrice ?? "—"}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 text-xs text-slate-500">التغير %</td>
                      {chosen.map((s) => (
                        <td key={s.ticker} className="py-2">{s.changePct ?? "—"}%</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 text-xs text-slate-500">الحجم</td>
                      {chosen.map((s) => (
                        <td key={s.ticker} className="py-2">{s.volume ?? "—"}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
