"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GitCompare, Search, X } from "lucide-react";
import type { StockSummaryItem } from "@/components/MarketDashboard";
import { matchStock } from "@/lib/search";
import { Num, Pct } from "@/components/Formatters";
import { formatDate, formatSignedPercent, formatVolume } from "@/lib/format";

type PeriodKey = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "1M", label: "شهر" },
  { key: "3M", label: "3 أشهر" },
  { key: "6M", label: "6 أشهر" },
  { key: "1Y", label: "سنة" },
  { key: "3Y", label: "3 سنوات" },
  { key: "5Y", label: "5 سنوات" },
  { key: "ALL", label: "منذ أول يوم" },
];

const LINE_COLORS = ["#047857", "#2563eb", "#d97706", "#dc2626"];

interface CompareItem {
  ticker: string;
  nameAr: string;
  sector: string;
  lastPrice: number | null;
  changePct: number | null;
  volume: number | null;
  high52w: number | null;
  low52w: number | null;
  rangePosPct: number | null;
  volatilityPct: number | null;
  storedDays: number;
  firstDate: string | null;
  lastDate: string | null;
  startsAfterPeriod: boolean;
  periodChangePct: number | null;
  periodHigh: number | null;
  periodLow: number | null;
  maxDrawdownPct: number | null;
  normalizedSeries: Array<{ date: string; value: number }>;
}

function CompareInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stocks, setStocks] = useState<StockSummaryItem[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [period, setPeriod] = useState<PeriodKey>("6M");
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  const [items, setItems] = useState<CompareItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Load initial tickers from URL (?t=COMI,HRHO)
  useEffect(() => {
    const t = searchParams.get("t");
    if (t) {
      const parsed = t
        .split(",")
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 4);
      setSelected(parsed);
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/stocks")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.stocks)) setStocks(d.stocks);
      })
      .catch(() => {});
  }, []);

  // Fetch comparison data when selection or period changes
  useEffect(() => {
    if (selected.length === 0) {
      setItems([]);
      return;
    }
    setLoading(true);
    fetch(
      `/api/compare?t=${encodeURIComponent(selected.join(","))}&period=${period}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.items)) setItems(d.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selected, period]);

  const updateSelection = (next: string[]) => {
    setSelected(next);
    const qs = next.length > 0 ? `?t=${next.join(",")}` : "";
    router.replace(`/compare${qs}`, { scroll: false });
  };

  const addTicker = (ticker: string) => {
    setLimitMsg(null);
    if (selected.includes(ticker)) return;
    if (selected.length >= 4) {
      setLimitMsg("الحد الأقصى 4 أسهم للمقارنة في نفس الوقت.");
      return;
    }
    updateSelection([...selected, ticker]);
    setQuery("");
  };

  const removeTicker = (ticker: string) => {
    setLimitMsg(null);
    updateSelection(selected.filter((t) => t !== ticker));
  };

  const suggestions = useMemo(() => {
    if (!query.trim()) return stocks.slice(0, 12);
    return stocks.filter((s) => matchStock(query, s)).slice(0, 15);
  }, [stocks, query]);

  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? period;

  // Plain Arabic summary sentence
  const summarySentence = useMemo(() => {
    const valid = items.filter((it) => it.periodChangePct !== null);
    if (valid.length < 2) return null;
    const parts = valid.map(
      (it) =>
        `${it.nameAr} (${it.ticker}) بنسبة ${formatSignedPercent(it.periodChangePct)}`
    );
    return `خلال فترة (${periodLabel}): تغيّر ${parts.join("، بينما تغيّر ")}.`;
  }, [items, periodLabel]);

  // Normalized-to-100 SVG chart
  const chartSvg = useMemo(() => {
    const withSeries = items.filter((it) => it.normalizedSeries.length >= 2);
    if (withSeries.length === 0) return null;

    const allVals = withSeries.flatMap((it) =>
      it.normalizedSeries.map((p) => p.value)
    );
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const range = max - min || 1;
    const w = 640;
    const h = 210;
    const pad = 18;

    return (
      <div className="space-y-2">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-56 w-full rounded-xl bg-slate-50"
          role="img"
          aria-label="مقارنة الأداء المطبّع إلى 100"
        >
          {withSeries.map((it, sIdx) => {
            const pts = it.normalizedSeries
              .map((p, i) => {
                const x =
                  pad +
                  (i / (it.normalizedSeries.length - 1)) * (w - pad * 2);
                const y = h - pad - ((p.value - min) / range) * (h - pad * 2);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(" ");
            return (
              <polyline
                key={it.ticker}
                fill="none"
                stroke={LINE_COLORS[sIdx % LINE_COLORS.length]}
                strokeWidth="2.5"
                points={pts}
              />
            );
          })}
        </svg>
        <div className="flex flex-wrap gap-3 text-xs">
          {withSeries.map((it, idx) => (
            <span key={it.ticker} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: LINE_COLORS[idx % LINE_COLORS.length] }}
              />
              <strong>{it.ticker}</strong> ({it.nameAr})
            </span>
          ))}
        </div>
      </div>
    );
  }, [items]);

  const bestPeriodReturn = useMemo(() => {
    const vals = items
      .map((i) => i.periodChangePct)
      .filter((v): v is number => v !== null);
    return vals.length > 0 ? Math.max(...vals) : null;
  }, [items]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-emerald-700" />
          <h1 className="text-xl font-bold text-slate-900">
            مقارنة الأسهم (من سهمين حتى 4 أسهم)
          </h1>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          ابحث بالاسم العربي أو الإنجليزي أو الرمز لاختيار أي سهم من البورصة المصرية،
          وسيحفظ الرابط اختيارك للمشاركة.
        </p>

        {/* Searchable selector */}
        <div className="relative mt-4 max-w-md">
          <Search className="pointer-events-none absolute top-2.5 right-3 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم العربي أو الإنجليزي أو الرمز..."
            className="w-full rounded-xl border border-slate-200 py-2 pr-9 pl-3 text-sm"
          />
          {query.trim() !== "" && suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {suggestions.map((s) => (
                <button
                  key={s.ticker}
                  type="button"
                  onClick={() => addTicker(s.ticker)}
                  className="flex w-full items-center justify-between px-3 py-2 text-right text-xs hover:bg-emerald-50"
                >
                  <span>
                    <strong>{s.ticker}</strong> — {s.nameAr}
                  </span>
                  <span className="text-slate-400">{s.sector}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {limitMsg && (
          <p className="mt-2 text-xs font-semibold text-amber-800">{limitMsg}</p>
        )}

        {/* Selected chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTicker(t)}
                aria-label={`إزالة ${t}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>

        {/* Period buttons */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                period === p.key
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {selected.length < 2 ? (
          <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
            اختر سهمين على الأقل (وحتى 4 أسهم) لبدء المقارنة الشاملة.
          </p>
        ) : loading ? (
          <p className="mt-6 text-center text-sm text-slate-500">
            جارٍ حساب المقارنة...
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            {summarySentence && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-950">
                {summarySentence}
              </div>
            )}

            {chartSvg && (
              <div>
                <h2 className="mb-2 text-sm font-bold text-slate-800">
                  مقارنة الأداء المطبّع (بداية الفترة = ١٠٠)
                </h2>
                {chartSvg}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="py-2">المعيار</th>
                    {items.map((it) => (
                      <th key={it.ticker} className="py-2 font-bold text-slate-900">
                        {it.ticker}
                        <div className="text-[11px] font-normal text-slate-500">
                          {it.nameAr}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 text-slate-500">السعر الحالي</td>
                    {items.map((it) => (
                      <td key={it.ticker} className="py-2 font-semibold">
                        <Num value={it.lastPrice} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">التغير اليومي %</td>
                    {items.map((it) => (
                      <td key={it.ticker} className="py-2">
                        <Pct value={it.changePct} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">حجم التداول</td>
                    {items.map((it) => (
                      <td key={it.ticker} className="py-2">
                        {formatVolume(it.volume, true)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">
                      الأداء خلال ({periodLabel})
                    </td>
                    {items.map((it) => (
                      <td key={it.ticker} className="py-2 font-semibold">
                        {it.startsAfterPeriod && it.firstDate ? (
                          <span className="text-xs text-amber-800">
                            السجل يبدأ من {formatDate(it.firstDate)}
                          </span>
                        ) : (
                          <>
                            <Pct value={it.periodChangePct} />
                            {bestPeriodReturn !== null &&
                              it.periodChangePct === bestPeriodReturn && (
                                <span className="mr-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800">
                                  الأعلى
                                </span>
                              )}
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">
                      أكبر هبوط من أعلى نقطة (Drawdown)
                    </td>
                    {items.map((it) => (
                      <td key={it.ticker} className="py-2">
                        <Pct value={it.maxDrawdownPct} signed={false} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">أعلى / أدنى سعر (52 أسبوعاً)</td>
                    {items.map((it) => (
                      <td key={it.ticker} className="py-2">
                        <Num value={it.high52w} /> / <Num value={it.low52w} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">موقع السعر في النطاق %</td>
                    {items.map((it) => (
                      <td key={it.ticker} className="py-2">
                        <Pct value={it.rangePosPct} signed={false} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">التذبذب اليومي (متوسط)</td>
                    {items.map((it) => (
                      <td key={it.ticker} className="py-2">
                        <Pct value={it.volatilityPct} signed={false} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-500">عدد أيام السجل المتاح</td>
                    {items.map((it) => (
                      <td key={it.ticker} className="py-2">
                        <Num value={it.storedDays} decimals={0} />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          جارٍ تحميل أداة المقارنة...
        </div>
      }
    >
      <CompareInner />
    </Suspense>
  );
}
