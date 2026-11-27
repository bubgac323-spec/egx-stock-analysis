import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RANKING_DISCLAIMER } from "@/lib/content-policy";

export default function RankingMethodologyPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/ranking"
        className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        العودة إلى أداة الترتيب
      </Link>

      <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h1 className="text-2xl font-bold text-slate-900">
          كيف يعمل الترتيب التاريخي؟ (المنهجية والقيود)
        </h1>
        <p className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-950">
          {RANKING_DISCLAIMER}
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">1. المعايير المستخدمة</h2>
          <p className="text-sm leading-relaxed text-slate-700">
            يُحسب الترتيب تلقائياً من تشغيل الاختبار التاريخي (Backtest) والمؤشرات
            الفنية على الشموع المخزنة فعلياً في قاعدة البيانات لكل سهم، عبر أربعة
            محاور قابلة لتعديل الأوزان من قِبل المستخدم:
          </p>
          <ul className="list-disc space-y-1 pr-5 text-sm text-slate-700">
            <li>نسبة نجاح الصفقات التاريخية (Win Rate) في الفترة المختبَرة.</li>
            <li>متوسط العائد الصافي للصفقة (Average Return %).</li>
            <li>انخفاض أقصى تراجع تاريخي (Max Drawdown).</li>
            <li>نشاط حجم التداول مقارنة بمتوسطه التاريخي (Volume Ratio).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">2. نقاط الضعف والقيود (بصراحة)</h2>
          <ul className="list-disc space-y-1 pr-5 text-sm text-slate-700">
            <li>
              <strong>الأداء التاريخي لا يتنبأ بالمستقبل:</strong> تغيّر ظروف السوق أو
              الأخبار الجوهرية قد يقلب النتائج تماماً.
            </li>
            <li>
              <strong>حجم العينة:</strong> على الخطة المجانية من Mansa API تتراكم
              شموع الـ 30 دقيقة تدريجياً، لذا قد تكون العينات صغيرة (&lt; 30 صفقة)
              ويظهر تحذير واضح عند ذلك.
            </li>
            <li>
              <strong>العمولات والانزلاق السعري:</strong> الترتيب الافتراضي لا يفترض
              عمولة وساطة محددة؛ يمكنك إدخال عمولتك في أداة الاختبار التاريخي.
            </li>
          </ul>
        </section>
      </article>
    </div>
  );
}
