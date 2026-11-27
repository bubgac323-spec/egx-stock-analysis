"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Filter, X } from "lucide-react";
import { useInvestorLevel } from "@/components/InvestorLevelProvider";
import type { StockSummaryItem } from "@/components/MarketDashboard";
import { matchStock } from "@/lib/search";
import { Num, Pct } from "@/components/Formatters";
import { formatVolume } from "@/lib/format";

type TemplateId = "active" | "up" | "down" | null;

export default function ScreenerPage() {
  const { level } = useInvestorLevel();
  const [stocks, setStocks] = useState<StockSummaryItem[]>([]);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("ALL");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minChangePct, setMinChangePct] = useState("");
  const [maxChangePct, setMaxChangePct] = useState("");
  const [minVolume, setMinVolume] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>(null);

  useEffect(() => {
    fetch("/api/stocks")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.stocks)) setStocks(d.stocks);
      })
      .catch(() => {});
  }, []);

  const sectors = useMemo(() => {
    const s = new Set(stocks.map((x) => x.sector));
    return ["ALL", ...Array.from(s).sort()];
  }, [stocks]);

  const applyTemplate = (tpl: TemplateId) => {
    setActiveTemplate(tpl);
    if (tpl === null) {
      setQuery("");
      setSector("ALL");
      setMinPrice("");
      setMaxPrice("");
      setMinChangePct("");
      setMaxChangePct("");
      setMinVolume("");
    } else if (tpl === "active") {
      setMinPrice("");
      setMaxPrice("");
      setMinChangePct("");
      setMaxChangePct("");
      setMinVolume("100000");
    } else if (tpl === "up") {
      setMinPrice("");
      setMaxPrice("");
      setMinChangePct("2");
      setMaxChangePct("");
      setMinVolume("");
    } else if (tpl === "down") {
      setMinPrice("");
      setMaxPrice("");
      setMinChangePct("");
      setMaxChangePct("-2");
      setMinVolume("");
    }
  };

  // Validation: min <= max
  const validationError = useMemo(() => {
    if (minPrice !== "" && maxPrice !== "" && Number(minPrice) > Number(maxPrice)) {
      return "الحد الأدنى للسعر أكبر من الحد الأعلى.";
    }
    if (
      minChangePct !== "" &&
      maxChangePct !== "" &&
      Number(minChangePct) > Number(maxChangePct)
    ) {
      return "الحد الأدنى لنسبة التغير أكبر من الحد الأعلى.";
    }
    return null;
  }, [minPrice, maxPrice, minChangePct, maxChangePct]);

  const activeChips = useMemo(() => {
    const chips: string[] = [];
    if (sector !== "ALL") chips.push(`القطاع: ${sector}`);
    if (minPrice !== "") chips.push(`السعر ≥ ${minPrice}`);
    if (maxPrice !== "") chips.push(`السعر ≤ ${maxPrice}`);
    if (minChangePct !== "") chips.push(`التغير ≥ ${minChangePct}%`);
    if (maxChangePct !== "") chips.push(`التغير ≤ ${maxChangePct}%`);
    if (minVolume !== "") chips.push(`الحجم ≥ ${minVolume}`);
    return chips;
  }, [sector, minPrice, maxPrice, minChangePct, maxChangePct, minVolume]);

  const results = useMemo(() => {
    if (validationError) return [];
    return stocks.filter((s) => {
      if (sector !== "ALL" && s.sector !== sector) return false;
      if (!matchStock(query, s)) return false;
      if (minPrice !== "" && (s.lastPrice ?? -Infinity) < Number(minPrice))
        return false;
      if (maxPrice !== "" && (s.lastPrice ?? Infinity) > Number(maxPrice))
        return false;
      if (minChangePct !== "" && (s.changePct ?? -Infinity) < Number(minChangePct))
        return false;
      if (maxChangePct !== "" && (s.changePct ?? Infinity) > Number(maxChangePct))
        return false;
      if (minVolume !== "" && (s.volume ?? -Infinity) < Number(minVolume))
        return false;
      return true;
    });
  }, [
    stocks,
    sector,
    query,
    minPrice,
    maxPrice,
    minChangePct,
    maxChangePct,
    minVolume,
    validationError,
  ]);

  return (
    <div className="space-y-6">
      {level === "beginner" && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-950">
          <h2 className="font-bold">ما هذه الصفحة؟</h2>
          <p className="mt-1 text-xs leading-relaxed">
            تساعدك على تضييق قائمة أسهم البورصة حسب شروط بسيطة مثل الأسهم الأكثر
            ارتفاعاً اليوم أو الأكثر تداولاً. جرّب أحد القوالب الجاهزة أدناه.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-emerald-700" />
          <h1 className="text-xl font-bold text-slate-900">
            مرشِّح الأسهم (Screener)
          </h1>
        </div>

        {/* Preset templates that populate inputs */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyTemplate("active")}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium ${
              activeTemplate === "active"
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50"
            }`}
          >
            قالب: حجم تداول نشط (≥ ١٠٠ ألف)
          </button>
          <button
            type="button"
            onClick={() => applyTemplate("up")}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium ${
              activeTemplate === "up"
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50"
            }`}
          >
            قالب: ارتفاع يومي أعلى من ٢%
          </button>
          <button
            type="button"
            onClick={() => applyTemplate("down")}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium ${
              activeTemplate === "down"
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50"
            }`}
          >
            قالب: نزول يومي أكثر من ٢%
          </button>
          <button
            type="button"
            onClick={() => applyTemplate(null)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" />
            مسح الكل
          </button>
        </div>

        {/* Filter inputs */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="search"
            placeholder="ابحث بالاسم العربي أو الإنجليزي أو الرمز..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">كل القطاعات</option>
            {sectors
              .filter((s) => s !== "ALL")
              .map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
          </select>
          <input
            type="number"
            placeholder="أدنى سعر (ج.م)"
            value={minPrice}
            onChange={(e) => {
              setActiveTemplate(null);
              setMinPrice(e.target.value);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="أعلى سعر (ج.م)"
            value={maxPrice}
            onChange={(e) => {
              setActiveTemplate(null);
              setMaxPrice(e.target.value);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="أدنى نسبة تغير %"
            value={minChangePct}
            onChange={(e) => {
              setActiveTemplate(null);
              setMinChangePct(e.target.value);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="أعلى نسبة تغير %"
            value={maxChangePct}
            onChange={(e) => {
              setActiveTemplate(null);
              setMaxChangePct(e.target.value);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="أدنى حجم تداول"
            value={minVolume}
            onChange={(e) => {
              setActiveTemplate(null);
              setMinVolume(e.target.value);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        {validationError && (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            {validationError}
          </p>
        )}

        {/* Active chips & result count */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">
            النتائج: <Num value={results.length} decimals={0} /> سهم
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip}
              className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-900"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-4">
          {results.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
              {stocks.length === 0
                ? "لا توجد بيانات أسهم مخزنة في قاعدة البيانات بعد."
                : "لا توجد أسهم تطابق الشروط الحالية. جرّب تخفيف المعايير أو الضغط على (مسح الكل)."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="py-2">السهم</th>
                    <th className="py-2">القطاع</th>
                    <th className="py-2">السعر</th>
                    <th className="py-2">التغير %</th>
                    <th className="py-2">الحجم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((s) => (
                    <tr key={s.ticker}>
                      <td className="py-2.5 font-semibold">
                        <Link
                          href={`/stocks/${s.ticker}`}
                          className="hover:text-emerald-700"
                        >
                          <bdi dir="ltr">{s.ticker}</bdi> — {s.nameAr}
                        </Link>
                      </td>
                      <td className="py-2.5 text-xs text-slate-600">{s.sector}</td>
                      <td className="py-2.5">
                        <Num value={s.lastPrice} />
                      </td>
                      <td className="py-2.5">
                        <Pct value={s.changePct} />
                      </td>
                      <td className="py-2.5">{formatVolume(s.volume, true)}</td>
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
