"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, Download, Trash2, Upload } from "lucide-react";
import type { StockSummaryItem } from "@/components/MarketDashboard";
import { matchStock } from "@/lib/search";
import { ClientDateTime, Num, Pct } from "@/components/Formatters";

interface Position {
  id: string;
  ticker: string;
  shares: number;
  avgCost: number;
  currentPrice?: number; // legacy field kept for backward compatibility
  commission: number;
}

const STORAGE_KEY = "egx_local_portfolio";

export default function PortfolioPage() {
  const [stocks, setStocks] = useState<StockSummaryItem[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [search, setSearch] = useState("");
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [commission, setCommission] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setPositions(JSON.parse(raw));
    } catch {
      // ignore
    }
    fetch("/api/stocks")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.stocks)) setStocks(d.stocks);
      })
      .catch(() => {});
  }, []);

  const stockMap = useMemo(() => {
    const m = new Map<string, StockSummaryItem>();
    for (const s of stocks) m.set(s.ticker.toUpperCase(), s);
    return m;
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    if (!search.trim()) return stocks.slice(0, 10);
    return stocks.filter((s) => matchStock(search, s)).slice(0, 12);
  }, [stocks, search]);

  const selectedStock = ticker ? stockMap.get(ticker.toUpperCase()) : undefined;

  const save = (next: Position[]) => {
    setPositions(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const addPosition = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const cleanTicker = ticker.trim().toUpperCase();
    const sharesNum = Number(shares);
    const costNum = Number(avgCost);

    if (!cleanTicker) {
      setFormError("اختر السهم أولاً.");
      return;
    }
    if (!Number.isFinite(sharesNum) || sharesNum <= 0) {
      setFormError("أدخل عدد الأسهم (رقم أكبر من صفر).");
      return;
    }
    if (!Number.isFinite(costNum) || costNum <= 0) {
      setFormError("أدخل سعر الشراء (رقم أكبر من صفر).");
      return;
    }

    const next: Position = {
      id: `${Date.now()}`,
      ticker: cleanTicker,
      shares: sharesNum,
      avgCost: costNum,
      commission: commission === "" ? 0 : Math.max(0, Number(commission) || 0),
    };
    save([next, ...positions]);
    setTicker("");
    setSearch("");
    setShares("");
    setAvgCost("");
    setCommission("");
  };

  // Compute P&L strictly from stored market price (stocks.lastPrice)
  const enriched = positions.map((p) => {
    const live = stockMap.get(p.ticker.toUpperCase());
    const livePrice = live?.lastPrice ?? null;
    const cost = p.shares * p.avgCost + (p.commission || 0);
    const value = livePrice !== null ? p.shares * livePrice : null;
    const pnl = value !== null ? value - cost : null;
    const pnlPct = pnl !== null && cost > 0 ? (pnl / cost) * 100 : null;
    return { ...p, live, livePrice, cost, value, pnl, pnlPct };
  });

  const totalCost = enriched.reduce((a, p) => a + p.cost, 0);
  const totalValue = enriched.reduce((a, p) => a + (p.value ?? 0), 0);
  const pricedCost = enriched
    .filter((p) => p.value !== null)
    .reduce((a, p) => a + p.cost, 0);
  const totalPnl = totalValue - pricedCost;
  const totalPnlPct = pricedCost > 0 ? (totalPnl / pricedCost) * 100 : 0;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(positions, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "egx-portfolio.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed)) save(parsed);
      } catch {
        // ignore
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-emerald-700" />
            <h1 className="text-xl font-bold text-slate-900">
              متتبع المحفظة (محلي في المتصفح فقط)
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportJson}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium"
            >
              <Download className="h-3.5 w-3.5" />
              تصدير
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium">
              <Upload className="h-3.5 w-3.5" />
              استيراد
              <input
                type="file"
                accept="application/json"
                onChange={importJson}
                className="hidden"
              />
            </label>
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          يُحسب الربح والخسارة تلقائياً من آخر سعر مخزّن للسهم في قاعدة البيانات.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">إجمالي التكلفة</div>
            <div className="mt-1 text-lg font-bold">
              <Num value={totalCost} /> ج.م
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">القيمة الحالية (للأسهم المسعّرة)</div>
            <div className="mt-1 text-lg font-bold">
              <Num value={totalValue} /> ج.م
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">صافي الربح / الخسارة</div>
            <div
              className={`mt-1 text-lg font-bold ${
                totalPnl >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              <Num value={totalPnl} /> ج.م (<Pct value={totalPnlPct} />)
            </div>
          </div>
        </div>

        <form onSubmit={addPosition} noValidate className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث بالاسم العربي أو الإنجليزي أو الرمز..."
                value={search || ticker}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setTicker(e.target.value.toUpperCase());
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              {search.trim() !== "" && filteredStocks.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {filteredStocks.map((s) => (
                    <button
                      key={s.ticker}
                      type="button"
                      onClick={() => {
                        setTicker(s.ticker);
                        setSearch("");
                      }}
                      className="flex w-full justify-between px-3 py-2 text-right text-xs hover:bg-emerald-50"
                    >
                      <span>
                        <strong>{s.ticker}</strong> — {s.nameAr}
                      </span>
                      <span>
                        <Num value={s.lastPrice} />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              type="number"
              placeholder="عدد الأسهم"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.01"
              placeholder="سعر الشراء (ج.م)"
              value={avgCost}
              onChange={(e) => setAvgCost(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.01"
              placeholder="العمولة (فارغ افتراضياً)"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              إضافة مركز
            </button>
          </div>

          {selectedStock && (
            <p className="text-xs text-slate-600">
              السعر الحالي المخزّن لـ <strong>{selectedStock.ticker}</strong>:{" "}
              <strong>
                {selectedStock.lastPrice !== null ? (
                  <Num value={selectedStock.lastPrice} />
                ) : (
                  "السعر غير متاح"
                )}
              </strong>{" "}
              ج.م · آخر تحديث: <ClientDateTime value={selectedStock.dataUpdatedAt} />
            </p>
          )}

          {formError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800">
              {formError}
            </p>
          )}
        </form>

        {enriched.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="py-2">السهم</th>
                  <th className="py-2">الكمية</th>
                  <th className="py-2">سعر الشراء</th>
                  <th className="py-2">السعر الحالي</th>
                  <th className="py-2">الربح / الخسارة</th>
                  <th className="py-2">التركّز %</th>
                  <th className="py-2">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enriched.map((p) => {
                  const weight =
                    totalValue > 0 && p.value !== null
                      ? (p.value / totalValue) * 100
                      : null;
                  return (
                    <tr key={p.id}>
                      <td className="py-2 font-bold">
                        {p.ticker}
                        {p.live && (
                          <div className="text-[11px] font-normal text-slate-500">
                            {p.live.nameAr}
                          </div>
                        )}
                      </td>
                      <td className="py-2">
                        <Num value={p.shares} decimals={0} />
                      </td>
                      <td className="py-2">
                        <Num value={p.avgCost} />
                      </td>
                      <td className="py-2">
                        {p.livePrice !== null ? (
                          <Num value={p.livePrice} />
                        ) : (
                          <span className="text-xs text-slate-400">السعر غير متاح</span>
                        )}
                      </td>
                      <td
                        className={`py-2 font-semibold ${
                          (p.pnl ?? 0) >= 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {p.pnl !== null ? (
                          <>
                            <Num value={p.pnl} /> (<Pct value={p.pnlPct} />)
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2">
                        {weight !== null ? <Pct value={weight} signed={false} /> : "-"}
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() =>
                            save(positions.filter((x) => x.id !== p.id))
                          }
                          aria-label="حذف المركز"
                          className="text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
