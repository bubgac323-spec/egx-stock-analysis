"use client";

import { useRef, useState } from "react";
import { Database, Lock, Pause, Play, RefreshCw, RotateCcw } from "lucide-react";

interface BackfillTotals {
  done: number;
  pending: number;
  no_match: number;
  error: number;
  total: number;
}

interface BackfillRow {
  ticker: string;
  status: string;
  yahooSymbol?: string | null;
  firstDate?: string | null;
  lastDate?: string | null;
  candlesCount?: number;
  message?: string | null;
}

export default function AdminSyncPage() {
  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  // Backfill state
  const [totals, setTotals] = useState<BackfillTotals | null>(null);
  const [issues, setIssues] = useState<BackfillRow[]>([]);
  const [completed, setCompleted] = useState<BackfillRow[]>([]);
  const [running, setRunning] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);
  const stopRef = useRef(false);

  const loadBackfillStatus = async (key = adminKey) => {
    if (!key.trim()) return;
    try {
      const res = await fetch("/api/admin/backfill", {
        headers: { "x-admin-key": key },
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTotals(data.totals);
        setIssues(data.issues ?? []);
        setCompleted(data.completed ?? []);
        setBackfillMsg(null);
      } else {
        setBackfillMsg(data.error ?? "تعذّر قراءة حالة الاسترجاع.");
      }
    } catch {
      setBackfillMsg("تعذّر الاتصال بالخادم.");
    }
  };

  const triggerSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch("/api/cron/sync", {
        method: "POST",
        headers: { "x-admin-key": adminKey },
      });
      const data = await res.json();
      setResponse(JSON.stringify({ status: res.status, ...data }, null, 2));
      if (res.ok) await loadBackfillStatus(adminKey);
    } catch {
      setResponse("تعذّر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  const runBackfillLoop = async (retryErrors = false) => {
    if (!adminKey.trim()) {
      setBackfillMsg("أدخل ADMIN_KEY أولاً.");
      return;
    }
    stopRef.current = false;
    setRunning(true);
    setBackfillMsg("جارٍ استرجاع السجل التاريخي على دفعات...");

    try {
      while (!stopRef.current) {
        const res = await fetch("/api/admin/backfill", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminKey,
          },
          body: JSON.stringify({ batchSize: 3, retryErrors }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setBackfillMsg(data.error ?? "توقّف الاسترجاع بسبب خطأ.");
          break;
        }
        setTotals(data.totals);
        setBackfillMsg(
          `تمت معالجة ${data.processed?.length ?? 0} أسهم. المتبقي: ${data.remaining}.`
        );

        if (data.finished) {
          setBackfillMsg("اكتمل استرجاع السجل التاريخي لجميع الأسهم المتاحة.");
          break;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch {
      setBackfillMsg("انقطع الاتصال أثناء الاسترجاع. يمكنك الاستئناف من حيث توقف.");
    } finally {
      setRunning(false);
      await loadBackfillStatus(adminKey);
    }
  };

  const pct =
    totals && totals.total > 0
      ? Math.round(((totals.total - totals.pending) / totals.total) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* بطاقة مزامنة Mansa */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-slate-700" />
          <h1 className="text-lg font-bold text-slate-900">
            إدارة تحديث البيانات (محمية بمفتاح ADMIN_KEY)
          </h1>
        </div>
        <form onSubmit={triggerSync} className="space-y-3">
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onBlur={() => loadBackfillStatus()}
            placeholder="أدخل ADMIN_KEY"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            required
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              تشغيل مزامنة Mansa API الآن
            </button>
            <button
              type="button"
              onClick={() => loadBackfillStatus()}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              تحديث حالة الاسترجاع
            </button>
          </div>
        </form>
        {response && (
          <pre className="overflow-x-auto rounded-xl bg-slate-950 p-3 text-left text-xs text-emerald-300">
            {response}
          </pre>
        )}
      </section>

      {/* بطاقة استرجاع السجل التاريخي من Yahoo Finance */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-emerald-700" />
          <h2 className="text-lg font-bold text-slate-900">
            استرجاع السجل التاريخي (Yahoo Finance — شموع يومية)
          </h2>
        </div>

        {totals && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>
                التقدم: {totals.total - totals.pending} من {totals.total} سهماً ({pct}%)
              </span>
              <span>مكتمل: {totals.done}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-emerald-600 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-900">
                مكتمل: <strong>{totals.done}</strong>
              </div>
              <div className="rounded-xl bg-slate-100 p-2 text-slate-800">
                بانتظار: <strong>{totals.pending}</strong>
              </div>
              <div className="rounded-xl bg-amber-50 p-2 text-amber-900">
                بدون تطابق: <strong>{totals.no_match}</strong>
              </div>
              <div className="rounded-xl bg-rose-50 p-2 text-rose-900">
                أخطاء: <strong>{totals.error}</strong>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!running ? (
            <button
              type="button"
              onClick={() => runBackfillLoop(false)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <Play className="h-4 w-4" />
              ابدأ / أكمل الاسترجاع
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                stopRef.current = true;
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white"
            >
              <Pause className="h-4 w-4" />
              إيقاف مؤقت
            </button>
          )}

          <button
            type="button"
            disabled={running}
            onClick={() => runBackfillLoop(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            إعادة محاولة الأخطاء
          </button>
        </div>

        {backfillMsg && (
          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
            {backfillMsg}
          </p>
        )}

        {issues.length > 0 && (
          <div className="overflow-x-auto">
            <h3 className="mb-2 text-sm font-bold text-slate-800">
              أسهم بدون تطابق أو بأخطاء (آخر 20)
            </h3>
            <table className="w-full text-right text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-1.5">الرمز</th>
                  <th className="py-1.5">الحالة</th>
                  <th className="py-1.5">الرسالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issues.map((row) => (
                  <tr key={row.ticker}>
                    <td className="py-1.5 font-bold">{row.ticker}</td>
                    <td className="py-1.5">{row.status}</td>
                    <td className="py-1.5 text-slate-600">{row.message ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {completed.length > 0 && (
          <details className="rounded-xl border border-slate-200 p-3 text-xs">
            <summary className="cursor-pointer font-bold text-slate-800">
              الأسهم المكتملة ({completed.length}) — اضغط للعرض
            </summary>
            <div className="mt-3 max-h-64 overflow-y-auto">
              <table className="w-full text-right">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-1">السهم</th>
                    <th className="py-1">من</th>
                    <th className="py-1">إلى</th>
                    <th className="py-1">الأيام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {completed.map((c) => (
                    <tr key={c.ticker}>
                      <td className="py-1 font-semibold">{c.ticker}</td>
                      <td className="py-1">{c.firstDate ?? "-"}</td>
                      <td className="py-1">{c.lastDate ?? "-"}</td>
                      <td className="py-1">{c.candlesCount ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>
    </div>
  );
}
