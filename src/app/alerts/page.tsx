"use client";

import { useEffect, useState } from "react";
import { Bell, Trash2 } from "lucide-react";

interface LocalAlert {
  id: string;
  ticker: string;
  condition: "above" | "below";
  targetPrice: number;
}

const STORAGE_KEY = "egx_local_alerts";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<LocalAlert[]>([]);
  const [ticker, setTicker] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [targetPrice, setTargetPrice] = useState("");
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
  }, []);

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
    if (!ticker.trim() || !targetPrice) return;
    const item: LocalAlert = {
      id: `${Date.now()}`,
      ticker: ticker.trim().toUpperCase(),
      condition,
      targetPrice: Number(targetPrice),
    };
    save([item, ...alerts]);
    setTicker("");
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
            <h1 className="text-xl font-bold text-slate-900">تنبيهات الأسعار المحلية</h1>
          </div>
          <button
            type="button"
            onClick={requestNotif}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            إشعارات المتصفح: {notifStatus}
          </button>
        </div>

        <form onSubmit={addAlert} className="mt-4 grid gap-3 sm:grid-cols-4">
          <input
            type="text"
            placeholder="رمز السهم (مثل COMI)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            required
          />
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
            required
          />
          <button
            type="submit"
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            إضافة تنبيه
          </button>
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
                  {a.condition === "above" ? "فوق" : "تحت"} {a.targetPrice} ج.م
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
