"use client";

import { useState } from "react";
import { Lock, RefreshCw } from "lucide-react";

export default function AdminSyncPage() {
  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const triggerSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch("/api/cron/sync", {
        method: "POST",
        headers: {
          "x-admin-key": adminKey,
        },
      });
      const data = await res.json();
      setResponse(JSON.stringify({ status: res.status, ...data }, null, 2));
    } catch {
      setResponse("تعذّر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
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
          placeholder="أدخل ADMIN_KEY"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          تشغيل مزامنة Mansa API الآن
        </button>
      </form>
      {response && (
        <pre className="overflow-x-auto rounded-xl bg-slate-950 p-3 text-left text-xs text-emerald-300">
          {response}
        </pre>
      )}
    </div>
  );
}
