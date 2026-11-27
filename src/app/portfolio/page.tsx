"use client";

import { useEffect, useState } from "react";
import { Briefcase, Download, Trash2, Upload } from "lucide-react";

interface Position {
  id: string;
  ticker: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  commission: number;
}

const STORAGE_KEY = "egx_local_portfolio";

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [commission, setCommission] = useState(""); // Empty by default!

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setPositions(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

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
    if (!ticker.trim() || !shares || !avgCost) return;
    const next: Position = {
      id: `${Date.now()}`,
      ticker: ticker.trim().toUpperCase(),
      shares: Number(shares),
      avgCost: Number(avgCost),
      currentPrice: Number(currentPrice || avgCost),
      commission: commission === "" ? 0 : Number(commission),
    };
    save([next, ...positions]);
    setTicker("");
    setShares("");
    setAvgCost("");
    setCurrentPrice("");
    setCommission("");
  };

  const totalCost = positions.reduce(
    (acc, p) => acc + p.shares * p.avgCost + p.commission,
    0
  );
  const totalValue = positions.reduce(
    (acc, p) => acc + p.shares * p.currentPrice,
    0
  );
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

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
        // ignore invalid file
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

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">إجمالي التكلفة</div>
            <div className="mt-1 text-lg font-bold">{totalCost.toFixed(2)} ج.م</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">القيمة الحالية</div>
            <div className="mt-1 text-lg font-bold">{totalValue.toFixed(2)} ج.م</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">صافي الربح / الخسارة</div>
            <div
              className={`mt-1 text-lg font-bold ${
                totalPnl >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {totalPnl.toFixed(2)} ج.م ({totalPnlPct.toFixed(2)}%)
            </div>
          </div>
        </div>

        <form onSubmit={addPosition} className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <input
            type="text"
            placeholder="الرمز (مثل COMI)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            required
          />
          <input
            type="number"
            placeholder="عدد الأسهم"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="سعر الشراء"
            value={avgCost}
            onChange={(e) => setAvgCost(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="السعر الحالي"
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
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
        </form>

        {positions.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="py-2">السهم</th>
                  <th className="py-2">الكمية</th>
                  <th className="py-2">التكلفة</th>
                  <th className="py-2">القيمة</th>
                  <th className="py-2">التركّز %</th>
                  <th className="py-2">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {positions.map((p) => {
                  const val = p.shares * p.currentPrice;
                  const weight = totalValue > 0 ? (val / totalValue) * 100 : 0;
                  return (
                    <tr key={p.id}>
                      <td className="py-2 font-bold">{p.ticker}</td>
                      <td className="py-2">{p.shares}</td>
                      <td className="py-2">{p.avgCost}</td>
                      <td className="py-2">{val.toFixed(2)}</td>
                      <td className="py-2">{weight.toFixed(1)}%</td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => save(positions.filter((x) => x.id !== p.id))}
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
