import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RANKING_DISCLAIMER } from "@/lib/content-policy";
import { DEFAULT_RANKING_WEIGHTS } from "@/lib/ranking";

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
          <h2 className="text-lg font-bold text-slate-900">
            1. المعايير والأوزان الافتراضية (المجموع = ١٠٠)
          </h2>
          <p className="text-sm leading-relaxed text-slate-700">
            يُحسب الترتيب تلقائياً من تشغيل الاختبار التاريخي والمؤشرات الفنية على
            الشموع المخزنة فعلياً في قاعدة البيانات لكل سهم، عبر أربعة محاور قابلة
            لتعديل الأوزان:
          </p>
          <ul className="list-disc space-y-1 pr-5 text-sm text-slate-700">
            <li>
              نسبة نجاح الصفقات التاريخية (Win Rate): الوزن الافتراضي{" "}
              <strong>{DEFAULT_RANKING_WEIGHTS.winRateWeight}%</strong>.
            </li>
            <li>
              متوسط العائد الصافي للصفقة (Average Return): الوزن الافتراضي{" "}
              <strong>{DEFAULT_RANKING_WEIGHTS.avgReturnWeight}%</strong>.
            </li>
            <li>
              انخفاض أقصى هبوط تاريخي (Max Drawdown): الوزن الافتراضي{" "}
              <strong>{DEFAULT_RANKING_WEIGHTS.drawdownWeight}%</strong>.
            </li>
            <li>
              نشاط حجم التداول مقارنة بمتوسطه (Volume Ratio): الوزن الافتراضي{" "}
              <strong>{DEFAULT_RANKING_WEIGHTS.volumeWeight}%</strong>.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">
            2. نقاط الضعف والقيود (بصراحة)
          </h2>
          <ul className="list-disc space-y-1 pr-5 text-sm text-slate-700">
            <li>
              <strong>الأداء التاريخي لا يتنبأ بالمستقبل:</strong> تغيّر ظروف السوق
              أو الأخبار الجوهرية قد يقلب النتائج تماماً.
            </li>
            <li>
              <strong>حجم العينة:</strong> العينات الصغيرة (&lt; 30 صفقة) أقل
              موثوقية إحصائياً ويظهر تحذير واضح بجانبها.
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
