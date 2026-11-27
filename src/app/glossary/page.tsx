import { BookOpen } from "lucide-react";

const TERMS = [
  {
    term: "الشمعة السعرية (Candlestick)",
    meaning:
      "تمثيل لحركة السعر خلال فترة زمنية محددة (مثل 30 دقيقة) يعرض سعر الافتتاح، الأعلى، الأدنى، والإغلاق.",
  },
  {
    term: "المتوسط المتحرك البسيط (SMA)",
    meaning:
      "متوسط أسعار الإغلاق لعدد محدد من الشموع السابقة لتوضيح الاتجاه التاريخي وتخفيف التذبذب.",
  },
  {
    term: "مؤشر القوة النسبية (RSI)",
    meaning:
      "مؤشر زخم يتراوح بين 0 و100؛ قراءة فوق 70 تصف منطقة تشبّع شرائي تاريخياً وتحت 30 تصف تشبّعاً بيعياً.",
  },
  {
    term: "أقصى تراجع (Max Drawdown)",
    meaning:
      "أكبر نسبة هبوط تاريخية من قمة إلى قاع خلال فترة الاختبار، ويُستخدم لفهم حجم المخاطرة.",
  },
  {
    term: "الإفراط في الملاءمة (Overfitting)",
    meaning:
      "ضبط قاعدة تداول لتبدو ممتازة على البيانات السابقة فقط دون أن تعمل بنفس الكفاءة خارج العينة.",
  },
  {
    term: "التنويع وحجم المركز",
    meaning:
      "مفاهيم تعليمية لإدارة المخاطر تعني عدم وضع كامل رأس المال في سهم واحد وتوزيع المخاطر بوعي.",
  },
];

export default function GlossaryPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-700" />
          <h1 className="text-2xl font-bold text-slate-900">
            القاموس ودليل المبتدئين
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          شروح مبسّطة للمصطلحات المستخدمة في أدوات التحليل والاختبار التاريخي.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {TERMS.map((t) => (
            <div
              key={t.term}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <h2 className="font-bold text-slate-900">{t.term}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                {t.meaning}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
