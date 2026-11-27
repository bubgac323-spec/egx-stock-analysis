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
import { PERMANENT_DISCLAIMER } from "@/lib/content-policy";
import type { MarketStatus } from "@/lib/market-data";
import { matchStock } from "@/lib/search";
import { displayName } from "@/lib/arabic-names";
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
  open?: number | null;
  high?: number | null;
  low?: number | null;
  prevClose?: number | null;
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
    const s = new Set(stocks.map((x) => x.sector).filter((x) => x !== "غير مصنّف"));
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
        `"${displayName(s).replace(/"/g, '""')}"`,
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
      {/* Hero Header */}
      <section className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">
          إيه اللي بيحصل في البورصة النهارده؟
        </h1>
        <p className="text-sm text-slate-600">
          تابع أسعار أسهم البورصة المصرية وتاريخ حركتها بكلمات بسيطة وواضحة.
        </p>
      </section>

      {/* Prominent Disclaimer */}
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-semibold">{PERMANENT_DISCLAIMER}</p>
            <p className="text-xs text-amber-800">
              الأسعار متأخرة افتراضياً بـ <Num value={status.delayMinutes} decimals={0} /> دقيقة ·
              آخر تحديث: <ClientDateTime value={status.lastSyncAt} />.
            </p>
          </div>
        </div>
      </section>

      {/* Market Summary & Top Movers */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="text-xs font-semibold text-slate-500">
            ملخص السوق النهارده
          </h2>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            <Num value={stocks.length} decimals={0} /> سهم
          </p>
          <p className="mt-1 text-xs text-slate-600">
            ارتفع: <Num value={summary.upCount} decimals={0} /> · نزل:{" "}
            <Num value={summary.downCount} decimals={0} />
          </p>
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            تأخير البيانات <Num value={status.delayMinutes} decimals={0} /> دقيقة
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="text-xs font-semibold text-slate-500">
            أكتر أسهم ارتفعت ونزلت النهارده
          </h2>
          {summary.gainers.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              مفيش بيانات تداول مخزّنة لسه.
            </p>
          ) : (
            <div className="mt-2.5 space-y-2 text-xs">
              {summary.gainers.map((g) => (
                <div key={g.ticker} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/stocks/${g.ticker}`}
                    className="truncate font-semibold text-emerald-700 hover:underline"
                  >
                    {displayName(g)}
                  </Link>
                  <Pct value={g.changePct} className="shrink-0 font-semibold text-emerald-700" />
                </div>
              ))}
              {summary.losers.slice(0, 2).map((l) => (
                <div key={l.ticker} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/stocks/${l.ticker}`}
                    className="truncate font-semibold text-rose-700 hover:underline"
                  >
                    {displayName(l)}
                  </Link>
                  <Pct value={l.changePct} className="shrink-0 font-semibold text-rose-700" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="text-xs font-semibold text-slate-500">
            أكتر أسهم عليها تداول النهارده
          </h2>
          {summary.topVolume.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              هتظهر هنا بعد أول تحديث للأسعار.
            </p>
          ) : (
            <div className="mt-2.5 space-y-2 text-xs">
              {summary.topVolume.map((v) => (
                <div key={v.ticker} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/stocks/${v.ticker}`}
                    className="truncate font-semibold text-slate-800 hover:underline"
                  >
                    {displayName(v)}
                  </Link>
                  <span className="shrink-0 text-slate-600">
                    {formatVolume(v.volume, true)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Search, Filters & Stock List */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-3 right-3 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="دوّر بالاسم العربي أو الإنجليزي أو الرمز (مثلاً: البنك التجاري)..."
              className="min-h-10 w-full rounded-xl border border-slate-200 py-2 pr-9 pl-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
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
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <option value="ticker">ترتيب بالرمز</option>
              <option value="changePct">الأعلى ارتفاعاً</option>
              <option value="volume">الأكتر تداولاً</option>
              <option value="lastPrice">الأعلى سعراً</option>
            </select>

            <button
              type="button"
              onClick={() => setOnlyWatchlist((v) => !v)}
              className={`inline-flex min-h-10 items-center gap-1 rounded-xl border px-3 py-2 text-xs font-medium transition-colors duration-150 ${
                onlyWatchlist
                  ? "border-amber-400 bg-amber-50 text-amber-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Star className="h-3.5 w-3.5" />
              متابعتي (<Num value={watchlist.length} decimals={0} />)
            </button>

            {filtered.length > 0 && (
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors duration-150 hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                تنزيل CSV
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-base font-semibold text-slate-800">
              {stocks.length === 0
                ? "لسه مفيش أسعار مخزّنة في قاعدة البيانات"
                : "مفيش أسهم مطابقة للبحث ده"}
            </p>
            <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-slate-600">
              {stocks.length === 0
                ? "الموقع مش بيعرض أي أسعار وهمية. أول ما تتشغل المزامنة هتظهر أسعار البورصة المصرية الحقيقية هنا."
                : "جرّب كلمة بحث تانية أو امسح الفلاتر."}
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => {
              const isUp = (s.changePct ?? 0) >= 0;
              const watched = watchlist.includes(s.ticker);
              const name = displayName(s);
              return (
                <div
                  key={s.ticker}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition-colors duration-150 hover:border-emerald-300 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/stocks/${s.ticker}`}
                      className="group min-w-0 flex-1"
                    >
                      <div className="truncate text-base font-bold text-slate-900 group-hover:text-emerald-700">
                        {name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        <bdi dir="ltr">{s.ticker}</bdi>
                        {s.sector && s.sector !== "غير مصنّف" && ` · ${s.sector}`}
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleWatch(s.ticker)}
                      aria-label={`تبديل متابعة ${s.ticker}`}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        watched
                          ? "text-amber-500"
                          : "text-slate-300 hover:text-amber-400"
                      }`}
                    >
                      <Star className="h-5 w-5 fill-current" />
                    </button>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-2">
                    <div>
                      <div className="text-[11px] text-slate-500">آخر سعر</div>
                      <div className="text-xl font-bold text-slate-900">
                        <Num value={s.lastPrice} />{" "}
                        <span className="text-xs font-normal text-slate-500">
                          ج.م
                        </span>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-[11px] text-slate-500">النهارده</div>
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
        )}
      </section>
    </div>
  );
}
