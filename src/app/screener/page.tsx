"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { useInvestorLevel } from "@/components/InvestorLevelProvider";
import type { StockSummaryItem } from "@/components/MarketDashboard";

export default function ScreenerPage() {
  const { level } = useInvestorLevel();
  const [stocks, setStocks] = useState<StockSummaryItem[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minChangePct, setMinChangePct] = useState("");
  const [minVolume, setMinVolume] = useState("");

  useEffect(() => {
    fetch("/api/stocks")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.stocks)) setStocks(d.stocks);
      })
      .catch(() => {});
  }, []);

  const applyTemplate = (tpl: "active" | "up" | "down" | "reset") => {
    if (tpl === "reset") {
      setMinPrice("");
      setMaxPrice("");
      setMinChangePct("");
      setMinVolume("");
    } else if (tpl === "active") {
      setMinVolume("100000");
      setMinChangePct("");
    } else if (tpl === "up") {
      setMinChangePct("2");
      setMinVolume("");
    } else if (tpl === "down") {
      setMinChangePct("-100");
      setMinVolume("");
    }
  };

  const results = useMemo(() => {
    return stocks.filter((s) => {
      if (minPrice !== "" && (s.lastPrice ?? -Infinity) < Number(minPrice))
        return false;
      if (maxPrice !== "" && (s.lastPrice ?? Infinity) > Number(maxPrice))
        return false;
      if (minChangePct !== "" && (s.changePct ?? -Infinity) < Number(minChangePct))
        return false;
      if (minVolume !== "" && (s.volume ?? -Infinity) < Number(minVolume))
        return false;
      return true;
    });
  }, [stocks, minPrice, maxPrice, minChangePct, minVolume]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-emerald-700" />
          <h1 className="text-xl font-bold text-slate-900">
            مرشِّح الأسهم (Screener)
          </h1>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          تصفية وصفية للأسهم المخزنة حسب السعر ونسبة التغير وحجم التداول.
        </p>

        {/* Beginner descriptive templates */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyTemplate("active")}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium hover:bg-emerald-50"
          >
            قالب: حجم تداول نشط (&gt; 100 ألف)
          </button>
          <button
            type="button"
            onClick={() => applyTemplate("up")}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium hover:bg-emerald-50"
          >
            قالب: ارتفاع يومي أعلى من 2%
          </button>
          <button
            type="button"
            onClick={() => applyTemplate("reset")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
          >
            إعادة تعيين
          </button>
        </div>

        {level !== "beginner" && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="number"
              placeholder="أدنى سعر (ج.م)"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="أعلى سعر (ج.م)"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="أدنى نسبة تغير %"
              value={minChangePct}
              onChange={(e) => setMinChangePct(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="أدنى حجم تداول"
              value={minVolume}
              onChange={(e) => setMinVolume(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div className="mt-5">
          {results.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
              {stocks.length === 0
                ? "لا توجد بيانات أسهم مخزنة في قاعدة البيانات بعد."
                : "لا توجد أسهم تطابق شروط المرشِّح الحالية."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="py-2">السهم</th>
                    <th className="py-2">السعر</th>
                    <th className="py-2">التغير %</th>
                    <th className="py-2">الحجم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((s) => (
                    <tr key={s.ticker}>
                      <td className="py-2.5 font-semibold">
                        <Link href={`/stocks/${s.ticker}`} className="hover:text-emerald-700">
                          {s.ticker} — {s.nameAr}
                        </Link>
                      </td>
                      <td className="py-2.5">{s.lastPrice ?? "—"}</td>
                      <td className="py-2.5">{s.changePct ?? "—"}%</td>
                      <td className="py-2.5">{s.volume ?? "—"}</td>
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
