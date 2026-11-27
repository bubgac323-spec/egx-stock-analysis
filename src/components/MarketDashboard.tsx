"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Download,
  Search,
  Star,
} from "lucide-react";
import { useInvestorLevel } from "./InvestorLevelProvider";
import { PERMANENT_DISCLAIMER } from "@/lib/content-policy";
import type { MarketStatus } from "@/lib/market-data";
import { matchStock } from "@/lib/search";
import { ClientDateTime, Num, Pct } from "./Formatters";
import { formatVolume } from "@/lib/format";

export interface StockSummaryItem {
  ticker: string;
  nameAr: string;
  nameEn: string;
  sector: string;
  currency: string;
  lastPrice: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  delayMinutes: number;
  dataUpdatedAt: string | null;
}

const WATCHLIST_KEY = "egx_watchlist";

export function MarketDashboard({
  stocks,
  status,
}: {
  stocks: StockSummaryItem[];
  status: MarketStatus;
}) {
  const { level } = useInvestorLevel();
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("ALL");
  const [sortBy, setSortBy] = useState<
    "ticker" | "changePct" | "volume" | "lastPrice"
  >("ticker");
  const [onlyWatchlist, setOnlyWatchlist] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WATCHLIST_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setWatchlist(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleWatch = (ticker: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(ticker)
        ? prev.filter((t) => t !== ticker)
        : [...prev, ticker];
      try {
        window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const sectors = useMemo(() => {
    const s = new Set(stocks.map((x) => x.sector));
    return ["ALL", ...Array.from(s).sort()];
  }, [stocks]);

  const filtered = useMemo(() => {
    return stocks
      .filter((s) => {
        if (onlyWatchlist && !watchlist.includes(s.ticker)) return false;
        if (sector !== "ALL" && s.sector !== sector) return false;
        return matchStock(query, s);
      })
      .sort((a, b) => {
        if (sortBy === "ticker") return a.ticker.localeCompare(b.ticker);
        const av = a[sortBy] ?? -Infinity;
        const bv = b[sortBy] ?? -Infinity;
        return bv - av;
      });
  }, [stocks, query, sector, sortBy, onlyWatchlist, watchlist]);

  const summary = useMemo(() => {
    const withChange = stocks.filter((s) => s.changePct !== null);
    const gainers = [...withChange]
      .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))
      .slice(0, 3);
    const losers = [...withChange]
      .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0))
      .slice(0, 3);
    const topVolume = [...stocks]
      .filter((s) => s.volume !== null)
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
      .slice(0, 3);
    const upCount = withChange.filter((s) => (s.changePct ?? 0) > 0).length;
    const downCount = withChange.filter((s) => (s.changePct ?? 0) < 0).length;
    return { gainers, losers, topVolume, upCount, downCount };
  }, [stocks]);

  const exportCsv = () => {
    const header = "ticker,name,sector,price,change_pct,volume,delay_min,updated_at";
    const rows = filtered.map((s) =>
      [
        s.ticker,
        `"${s.nameAr.replace(/"/g, '""')}"`,
        `"${s.sector.replace(/"/g, '""')}"`,
        s.lastPrice ?? "",
        s.changePct ?? "",
        s.volume ?? "",
        s.delayMinutes,
        s.dataUpdatedAt ?? "",
      ].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "egx-stocks.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Prominent Disclaimer */}
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-semibold">{PERMANENT_DISCLAIMER}</p>
            <p className="text-xs text-amber-800">
              البيانات متأخرة افتراضياً بـ <Num value={status.delayMinutes} decimals={0} /> دقيقة.
              آخر تحديث للسوق: <ClientDateTime value={status.lastSyncAt} />.
            </p>
          </div>
        </div>
      </section>

      {level === "beginner" && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-950">
          <h2 className="font-bold">وضع المبتدئ: كيف تبدأ؟</h2>
          <p className="mt-1 leading-relaxed text-emerald-900">
            ابحث عن أي شركة بالاسم العربي (مثل &quot;البنك التجاري&quot;) أو الرمز،
            واضغط عليها لترى ملخصاً بكلمات بسيطة وسجل أيام التداول الكامل.
          </p>
        </section>
      )}

      {/* Daily Summary (Tool 8) */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="text-xs font-semibold text-slate-500">
            {level === "beginner" ? "كيف حال السوق اليوم؟" : "حالة السوق العامة (وصفي)"}
          </h3>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            <Num value={stocks.length} decimals={0} /> سهم مسجّل
          </p>
          <p className="mt-1 text-xs text-slate-600">
            ارتفع: <Num value={summary.upCount} decimals={0} /> · نزل:{" "}
            <Num value={summary.downCount} decimals={0} />
          </p>
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            تأخير <Num value={status.delayMinutes} decimals={0} /> دقيقة · حصة Mansa اليوم:{" "}
            <Num value={status.requestsToday} decimals={0} />/
            <Num value={status.dailyLimit} decimals={0} />
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="text-xs font-semibold text-slate-500">
            أعلى الأسهم ارتفاعاً ونزولاً اليوم
          </h3>
          {summary.gainers.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              لا توجد بيانات تداول مخزنة بعد.
            </p>
          ) : (
            <div className="mt-2 space-y-1.5 text-xs">
              {summary.gainers.map((g) => (
                <div key={g.ticker} className="flex justify-between">
                  <Link
                    href={`/stocks/${g.ticker}`}
                    className="font-semibold text-emerald-700 hover:underline"
                  >
                    {g.nameAr} (<bdi dir="ltr">{g.ticker}</bdi>)
                  </Link>
                  <Pct value={g.changePct} className="font-semibold text-emerald-700" />
                </div>
              ))}
              {summary.losers.slice(0, 2).map((l) => (
                <div key={l.ticker} className="flex justify-between">
                  <Link
                    href={`/stocks/${l.ticker}`}
                    className="font-semibold text-rose-700 hover:underline"
                  >
                    {l.nameAr} (<bdi dir="ltr">{l.ticker}</bdi>)
                  </Link>
                  <Pct value={l.changePct} className="font-semibold text-rose-700" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="text-xs font-semibold text-slate-500">
            الأكثر تداولاً اليوم
          </h3>
          {summary.topVolume.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              ستظهر الأسهم الأكثر تداولاً بعد أول مزامنة مع Mansa API.
            </p>
          ) : (
            <div className="mt-2 space-y-1.5 text-xs">
              {summary.topVolume.map((v) => (
                <div key={v.ticker} className="flex justify-between">
                  <Link
                    href={`/stocks/${v.ticker}`}
                    className="font-semibold text-slate-800 hover:underline"
                  >
                    {v.nameAr} (<bdi dir="ltr">{v.ticker}</bdi>)
                  </Link>
                  <span className="text-slate-600">
                    {formatVolume(v.volume, true)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Filters & Search */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-2.5 right-3 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم العربي أو الإنجليزي أو الرمز..."
              className="w-full rounded-xl border border-slate-200 py-2 pr-9 pl-3 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
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

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "ticker" | "changePct" | "volume" | "lastPrice"
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <option value="ticker">ترتيب بالرمز</option>
              <option value="changePct">الأعلى تغيراً %</option>
              <option value="volume">الأكثر تداولاً</option>
              <option value="lastPrice">الأعلى سعراً</option>
            </select>

            <button
              type="button"
              onClick={() => setOnlyWatchlist((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-medium ${
                onlyWatchlist
                  ? "border-amber-400 bg-amber-50 text-amber-900"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <Star className="h-3.5 w-3.5" />
              المتابعة (<Num value={watchlist.length} decimals={0} />)
            </button>

            {level === "expert" && filtered.length > 0 && (
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-medium text-white"
              >
                <Download className="h-3.5 w-3.5" />
                تصدير CSV
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-base font-semibold text-slate-800">
              {stocks.length === 0
                ? "لا توجد بيانات أسهم مخزنة في قاعدة البيانات بعد"
                : "لا توجد أسهم تطابق معايير البحث الحالية"}
            </p>
            <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-slate-600">
              {stocks.length === 0
                ? "لا يعرض الموقع أي أسعار وهمية. عند تشغيل المزامنة الدورية (/api/cron/sync) على خادم متصل بـ Mansa API ستظهر أسعار أسهم البورصة المصرية الحقيقية هنا تلقائياً."
                : "جرّب تعديل كلمة البحث أو إزالة فلتر القطاع أو قائمة المتابعة."}
            </p>
          </div>
        ) : level === "beginner" ? (
          /* Large readable cards for Beginner mode */
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => {
              const isUp = (s.changePct ?? 0) >= 0;
              const watched = watchlist.includes(s.ticker);
              return (
                <div
                  key={s.ticker}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-emerald-300 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/stocks/${s.ticker}`} className="group">
                      <div className="text-base font-bold text-slate-900 group-hover:text-emerald-700">
                        {s.nameAr}
                      </div>
                      <div className="text-xs text-slate-500">
                        <bdi dir="ltr">{s.ticker}</bdi> · {s.sector}
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleWatch(s.ticker)}
                      aria-label={`تبديل متابعة ${s.ticker}`}
                      className={
                        watched ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
                      }
                    >
                      <Star className="h-5 w-5 fill-current" />
                    </button>
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-[11px] text-slate-500">آخر سعر</div>
                      <div className="text-xl font-bold text-slate-900">
                        <Num value={s.lastPrice} /> <span className="text-xs font-normal">ج.م</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-[11px] text-slate-500">ارتفع / نزل اليوم</div>
                      <span
                        className={`mt-0.5 inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-xs font-semibold ${
                          isUp
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {isUp ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        )}
                        <Pct value={s.changePct} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Full table for Intermediate & Expert */
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="py-2.5 pr-2">متابعة</th>
                  <th className="py-2.5">السهم</th>
                  <th className="py-2.5">القطاع</th>
                  <th className="py-2.5">السعر (ج.م)</th>
                  <th className="py-2.5">التغير %</th>
                  <th className="py-2.5">الحجم</th>
                  <th className="py-2.5">آخر تحديث</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => {
                  const isUp = (s.changePct ?? 0) >= 0;
                  const watched = watchlist.includes(s.ticker);
                  return (
                    <tr key={s.ticker} className="hover:bg-slate-50">
                      <td className="py-3 pr-2">
                        <button
                          type="button"
                          onClick={() => toggleWatch(s.ticker)}
                          aria-label={`تبديل متابعة ${s.ticker}`}
                          className={
                            watched
                              ? "text-amber-500"
                              : "text-slate-300 hover:text-amber-400"
                          }
                        >
                          <Star className="h-4 w-4 fill-current" />
                        </button>
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/stocks/${s.ticker}`}
                          className="font-bold text-slate-900 hover:text-emerald-700"
                        >
                          <bdi dir="ltr">{s.ticker}</bdi>
                        </Link>
                        <div className="text-xs text-slate-500">{s.nameAr}</div>
                      </td>
                      <td className="py-3 text-xs text-slate-600">{s.sector}</td>
                      <td className="py-3 font-semibold">
                        <Num value={s.lastPrice} />
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-xs font-medium ${
                            isUp
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {isUp ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          )}
                          <Pct value={s.changePct} />
                        </span>
                      </td>
                      <td className="py-3 text-xs text-slate-600">
                        {formatVolume(s.volume, false)}
                      </td>
                      <td className="py-3 text-xs text-slate-500">
                        <div>
                          <ClientDateTime value={s.dataUpdatedAt} />
                        </div>
                        <div className="text-[11px]">
                          تأخير <Num value={s.delayMinutes} decimals={0} /> د
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
