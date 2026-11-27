import { PERMANENT_DISCLAIMER } from "@/lib/content-policy";
import { AlertTriangle, MessageCircle } from "lucide-react";

export function DisclaimerFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-slate-900 text-slate-200">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 text-sm">
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <p className="leading-relaxed">{PERMANENT_DISCLAIMER}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="space-y-1">
            <p>
              مصدر الأسعار الحالية: Mansa API (تأخير افتراضي ٣٠ دقيقة) · مصدر السجل
              التاريخي اليومي: Yahoo Finance — جميع الإحصاءات محسوبة من البيانات
              المخزنة فعلياً فقط.
            </p>
            <p>تحليل أسهم البورصة المصرية (EGX) — موقع عام بدون تسجيل</p>
          </div>

          <a
            href="https://wa.me/201012019938"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-[#1ebe5d]"
          >
            <MessageCircle className="h-4 w-4" />
            <span>تم التطوير بواسطة Sheefo</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
