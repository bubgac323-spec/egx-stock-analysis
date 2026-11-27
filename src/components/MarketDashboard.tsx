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

function formatNumber(n: number | null, digits = 2): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("ar-EG", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "غير متاح بعد";
  try {
    return new Date(iso).toLocaleString("ar-EG", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

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
  const [sortBy, setSortBy] = useState<"ticker" | "changePct" | "volume" | "lastPrice">("ticker");
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
    return ["ALL", ...Array.from(s)];
  }, [stocks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stocks
      .filter((s) => {
        if (onlyWatchlist && !watchlist.includes(s.ticker)) return false;
        if (sector !== "ALL" && s.sector !== sector) return false;
        if (!q) return true;
        return (
          s.ticker.toLowerCase().includes(q) ||
          s.nameAr.toLowerCase().includes(q) ||
          s.nameEn.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === "ticker") return a.ticker.localeCompare(b.ticker);
        const av = a[sortBy] ?? -Infinity;
        const bv = b[sortBy] ?? -Infinity;
        return bv - av;
      });
  }, [stocks, query, sector, sortBy, onlyWatchlist, watchlist]);

  // Daily summary (Tool 8) — computed strictly from real stocks
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
              البيانات متأخرة افتراضياً بـ {status.delayMinutes} دقيقة حسب مصدر Mansa API.
              آخر تحديث للسوق: {formatDateTime(status.lastSyncAt)}.
            </p>
          </div>
        </div>
      </section>

      {/* Beginner educational banner */}
      {level === "beginner" && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-950">
          <h2 className="font-bold">وضع المبتدئ: كيف تقرأ لوحة السوق؟</h2>
          <p className="mt-1 leading-relaxed text-emerald-900">
            تعرض هذه اللوحة أسعار أسهم البورصة المصرية الحقيقية المخزنة من Mansa API مع
            نسبة التغير وحجم التداول. تذكّر مفاهيم إدارة المخاطر الأساسية: التنويع، عدم
            تركيز المحفظة في سهم واحد، وفهم حجم التذبذب قبل أي قرار.
          </p>
        </section>
      )}

      {/* Market Status & Daily Summary (Tool 8) */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="text-xs font-semibold text-slate-500">حالة السوق العامة (وصفي)</h3>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {stocks.length} سهم مسجّل
          </p>
          <p className="mt-1 text-xs text-slate-600">
            مرتفع: {summary.upCount} · منخفض: {summary.downCount}
          </p>
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            تأخير {status.delayMinutes} دقيقة · حصة Mansa اليوم: {status.requestsToday}/{status.dailyLimit}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="text-xs font-semibold text-slate-500">أكبر المرتفعين والمنخفضين</h3>
          {summary.gainers.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              لا توجد بيانات تداول مخزنة بعد.
            </p>
          ) : (
            <div className="mt-2 space-y-1.5 text-xs">
              {summary.gainers.map((g) => (
                <div key={g.ticker} className="flex justify-between">
                  <Link href={`/stocks/${g.ticker}`} className="font-semibold text-emerald-700 hover:underline">
                    {g.ticker}
                  </Link>
                  <span className="text-emerald-700">
                    +{formatNumber(g.changePct)}%
                  </span>
                </div>
              ))}
              {summary.losers.slice(0, 2).map((l) => (
                <div key={l.ticker} className="flex justify-between">
                  <Link href={`/stocks/${l.ticker}`} className="font-semibold text-rose-700 hover:underline">
                    {l.ticker}
                  </Link>
                  <span className="text-rose-700">
                    {formatNumber(l.changePct)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="text-xs font-semibold text-slate-500">الأعلى حجم تداول</h3>
          {summary.topVolume.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              ستظهر الأسهم الأعلى حجماً بعد أول مزامنة مع Mansa API.
            </p>
          ) : (
            <div className="mt-2 space-y-1.5 text-xs">
              {summary.topVolume.map((v) => (
                <div key={v.ticker} className="flex justify-between">
                  <Link href={`/stocks/${v.ticker}`} className="font-semibold text-slate-800 hover:underline">
                    {v.ticker}
                  </Link>
                  <span className="text-slate-600">{formatNumber(v.volume, 0)}</span>
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
              placeholder="ابحث برمز السهم (مثل COMI) أو الاسم..."
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
                setSortBy(e.target.value as "ticker" | "changePct" | "volume" | "lastPrice")
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <option value="ticker">ترتيب بالرمز</option>
              <option value="changePct">الأعلى تغيراً %</option>
              <option value="volume">الأعلى حجماً</option>
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
              المتابعة ({watchlist.length})
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

        {/* Empty state when no real data synced yet */}
        {filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-base font-semibold text-slate-800">
              {stocks.length === 0
                ? "لا توجد بيانات أسهم مخزنة في قاعدة البيانات بعد"
                : "لا توجد أسهم تطابق معايير البحث الحالية"}
            </p>
            <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-slate-600">
              {stocks.length === 0
                ? "التزاماً بسياسة الصدق المنهجي، لا يعرض الموقع أي أسعار وهمية أو تجريبية. عند تشغيل مهمة المزامنة الدورية (/api/cron/sync) على خادم متصل بـ Mansa API مع مفتاح MANSA_API_KEY، ستظهر أسعار أسهم البورصة المصرية الحقيقية هنا تلقائياً مع وقت التحديث وتأخير 30 دقيقة."
                : "جرّب تعديل كلمة البحث أو إزالة فلتر القطاع أو قائمة المتابعة."}
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="py-2.5 pr-2">متابعة</th>
                  <th className="py-2.5">السهم</th>
                  <th className="py-2.5">السعر (ج.م)</th>
                  <th className="py-2.5">التغير %</th>
                  {level !== "beginner" && <th className="py-2.5">الحجم</th>}
                  <th className="py-2.5">آخر تحديث / التأخير</th>
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
                          className={watched ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}
                        >
                          <Star className="h-4 w-4 fill-current" />
                        </button>
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/stocks/${s.ticker}`}
                          className="font-bold text-slate-900 hover:text-emerald-700"
                        >
                          {s.ticker}
                        </Link>
                        <div className="text-xs text-slate-500">{s.nameAr}</div>
                      </td>
                      <td className="py-3 font-semibold">
                        {formatNumber(s.lastPrice)}
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
                          {formatNumber(s.changePct)}%
                        </span>
                      </td>
                      {level !== "beginner" && (
                        <td className="py-3 text-xs text-slate-600">
                          {formatNumber(s.volume, 0)}
                        </td>
                      )}
                      <td className="py-3 text-xs text-slate-500">
                        <div>{formatDateTime(s.dataUpdatedAt)}</div>
                        <div className="text-[11px]">تأخير {s.delayMinutes} د</div>
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
