"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Trash2 } from "lucide-react";
import type { StockSummaryItem } from "@/components/MarketDashboard";
import { matchStock } from "@/lib/search";
import { Num } from "@/components/Formatters";

interface LocalAlert {
  id: string;
  ticker: string;
  condition: "above" | "below";
  targetPrice: number;
}

const STORAGE_KEY = "egx_local_alerts";

export default function AlertsPage() {
  const [stocks, setStocks] = useState<StockSummaryItem[]>([]);
  const [alerts, setAlerts] = useState<LocalAlert[]>([]);
  const [search, setSearch] = useState("");
  const [ticker, setTicker] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [targetPrice, setTargetPrice] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [notifStatus, setNotifStatus] = useState<string>("غير مفعّل");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setAlerts(JSON.parse(raw));
    } catch {
      // ignore
    }
    if (typeof Notification !== "undefined") {
      setNotifStatus(Notification.permission);
    }
    fetch("/api/stocks")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.stocks)) setStocks(d.stocks);
      })
      .catch(() => {});
  }, []);

  const filteredStocks = useMemo(() => {
    if (!search.trim()) return [];
    return stocks.filter((s) => matchStock(search, s)).slice(0, 10);
  }, [stocks, search]);

  const save = (next: LocalAlert[]) => {
    setAlerts(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const addAlert = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const cleanTicker = ticker.trim().toUpperCase();
    const priceNum = Number(targetPrice);
    if (!cleanTicker) {
      setFormError("اختر السهم أو أدخل رمزه أولاً.");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setFormError("أدخل السعر المستهدف (رقم أكبر من صفر).");
      return;
    }

    const item: LocalAlert = {
      id: `${Date.now()}`,
      ticker: cleanTicker,
      condition,
      targetPrice: priceNum,
    };
    save([item, ...alerts]);
    setTicker("");
    setSearch("");
    setTargetPrice("");
  };

  const requestNotif = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifStatus(perm);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>ملاحظة مهمة:</strong> تُحفظ التنبيهات محلياً في متصفحك فقط (بدون
        حساب) وتعمل <strong>فقط والموقع مفتوح</strong> في المتصفح.
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-emerald-700" />
            <h1 className="text-xl font-bold text-slate-900">
              تنبيهات الأسعار المحلية
            </h1>
          </div>
          <button
            type="button"
            onClick={requestNotif}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            إشعارات المتصفح: {notifStatus}
          </button>
        </div>

        <form onSubmit={addAlert} noValidate className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
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
              {filteredStocks.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
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
                    </button>
                  ))}
                </div>
              )}
            </div>

            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as "above" | "below")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="above">عندما يتجاوز السعر</option>
              <option value="below">عندما يهبط السعر تحت</option>
            </select>

            <input
              type="number"
              step="0.01"
              placeholder="السعر المستهدف (ج.م)"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />

            <button
              type="submit"
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              إضافة تنبيه
            </button>
          </div>

          {formError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800">
              {formError}
            </p>
          )}
        </form>

        <div className="mt-5 space-y-2">
          {alerts.length === 0 ? (
            <p className="text-center text-sm text-slate-500">
              لا توجد تنبيهات مضافة حالياً.
            </p>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-bold">{a.ticker}</span> —{" "}
                  {a.condition === "above" ? "فوق" : "تحت"}{" "}
                  <Num value={a.targetPrice} /> ج.م
                </div>
                <button
                  type="button"
                  onClick={() => save(alerts.filter((x) => x.id !== a.id))}
                  aria-label="حذف التنبيه"
                  className="text-rose-600 hover:text-rose-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
