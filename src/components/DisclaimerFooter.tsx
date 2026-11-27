import { PERMANENT_DISCLAIMER } from "@/lib/content-policy";
import { AlertTriangle } from "lucide-react";

export function DisclaimerFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-slate-900 text-slate-200">
      <div className="mx-auto max-w-7xl space-y-3 px-4 py-6 text-sm">
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <p className="leading-relaxed">{PERMANENT_DISCLAIMER}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <p>
            مصدر البيانات: Mansa API (تأخير افتراضي 30 دقيقة) — جميع الإحصاءات
            محسوبة من البيانات المخزنة فعلياً فقط.
          </p>
          <p>تحليل أسهم البورصة المصرية (EGX) — موقع عام بدون تسجيل</p>
        </div>
      </div>
    </footer>
  );
}
