"use client";

import { useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { normalizeArabic } from "@/lib/search";

interface GlossaryItem {
  id: string;
  ar: string;
  en: string;
  desc: string;
  example: string;
}

const TERMS: GlossaryItem[] = [
  {
    id: "ohlc",
    ar: "الشمعة السعرية وبيانات OHLC",
    en: "Candlestick / OHLC",
    desc: "تلخّص حركة السعر خلال يوم أو فترة محددة بأربعة أرقام: الافتتاح، الأعلى، الأدنى، والإغلاق. تساعدك على معرفة مدى تذبذب السعر خلال اليوم.",
    example: "مثال: افتتح السهم عند ٥٠، وصل إلى ٥٣، نزل إلى ٤٩، وأغلق عند ٥٢ ج.م.",
  },
  {
    id: "sma",
    ar: "المتوسط المتحرك البسيط",
    en: "SMA (Simple Moving Average)",
    desc: "متوسط سعر الإغلاق لعدد محدد من الأيام السابقة (مثل ٢٠ أو ٥٠ يوماً). يُستخدم لتوضيح الاتجاه العام وتخفيف التذبذب اليومي.",
    example: "مثال: إذا كانت إغلاقات آخر ٣ أيام هي ١٠ و٢٠ و٣٠، فإن SMA 3 يساوي ٢٠.",
  },
  {
    id: "ema",
    ar: "المتوسط المتحرك الأسي",
    en: "EMA (Exponential Moving Average)",
    desc: "نوع من المتوسطات المتحركة يعطي وزناً أكبر للأسعار الأحدث مقارنة بالأقدم. يستجيب أسرع لتغيّرات السعر من SMA.",
    example: "مثال: EMA 12 يتفاعل أسرع من SMA 12 عند حدوث صعود أو نزول مفاجئ.",
  },
  {
    id: "rsi",
    ar: "مؤشر القوة النسبية",
    en: "RSI (Relative Strength Index)",
    desc: "مؤشر يتراوح بين ٠ و١٠٠ يقيس سرعة الصعود أو النزول الأخير للسهم. قراءة فوق ٧٠ تصف تشبّعاً شرائياً تاريخياً وتحت ٣٠ تصف تشبّعاً بيعياً.",
    example: "مثال: RSI = ٧٥ يعني أن السهم ارتفع بقوة مؤخراً مقارنة بمتوسط حركته.",
  },
  {
    id: "macd",
    ar: "مؤشر MACD وخط الإشارة والهيستوجرام",
    en: "MACD / Signal / Histogram",
    desc: "يقيس الفرق بين متوسطين أسيّين (١٢ و٢٦) ويقارنه بخط إشارة (٩) لقياس تغيّر الزخم. الهيستوجرام هو الفرق بين الخطين.",
    example: "مثال: تحوّل الهيستوجرام من سالب إلى موجب يصف تحسّن الزخم التاريخي.",
  },
  {
    id: "bollinger",
    ar: "نطاقات بولينجر",
    en: "Bollinger Bands",
    desc: "قناة حول المتوسط المتحرك تتسع عندما يزداد التذبذب وتضيق عندما يهدأ السهم. تصف مدى ابتعاد السعر عن متوسطه الأخير.",
    example: "مثال: متوسط السعر ٥٠ والحد العلوي ٥٤ والسفلي ٤٦ ج.م.",
  },
  {
    id: "volume",
    ar: "حجم التداول",
    en: "Volume",
    desc: "إجمالي عدد الأسهم التي تم بيعها وشراؤها خلال يوم تداول واحد. يعكس مدى نشاط المستثمرين على السهم.",
    example: "مثال: حجم تداول ٢ مليون سهم يعني تداول مليوني سهم خلال الجلسة.",
  },
  {
    id: "volume-ratio",
    ar: "نسبة الحجم للمتوسط",
    en: "Volume Ratio",
    desc: "تقارن حجم تداول آخر يوم بمتوسط حجم آخر ٢٠ يوماً. قيمة أعلى من ١٫٣ تعني نشاطاً أعلى من المعتاد.",
    example: "مثال: نسبة ٢٫٠x تعني أن التداول اليوم ضعف المتوسط المعتاد.",
  },
  {
    id: "win-rate",
    ar: "نسبة النجاح",
    en: "Win Rate",
    desc: "النسبة المئوية للصفقات التي أغلقت على ربح من إجمالي الصفقات في الاختبار التاريخي. وحدها لا تكفي دون معرفة متوسط الربح والخسارة.",
    example: "مثال: ٦ صفقات رابحة من أصل ١٠ تعني نسبة نجاح ٦٠%.",
  },
  {
    id: "drawdown",
    ar: "أقصى هبوط من أعلى نقطة",
    en: "Max Drawdown",
    desc: "أكبر نسبة انخفاض متواصلة من قمة سابقة إلى أدنى قاع قبل التعافي. يقيس أسوأ خسارة مؤقتة حدثت في الفترة.",
    example: "مثال: هبوط السهم من ١٠٠ إلى ٨٠ يعني أقصى هبوط قدره ٢٠%.",
  },
  {
    id: "avg-return",
    ar: "متوسط العائد للصفقة",
    en: "Average Return",
    desc: "مجموع عوائد جميع الصفقات مقسوماً على عددها. يوضح المتوسط التاريخي لكل صفقة بعد خصم العمولات إن أُدخلت.",
    example: "مثال: صفقتان بعائد +٦% و-٢% متوسط عائدهما +٢%.",
  },
  {
    id: "buy-and-hold",
    ar: "العائد الإجمالي مقابل الشراء والاحتفاظ",
    en: "Total Return vs Buy & Hold",
    desc: "يقارن نتيجة تطبيق قاعدة تداول بنتيجة شراء السهم في بداية الفترة والاحتفاظ به حتى نهايتها دون بيع.",
    example: "مثال: القاعدة حققت ١٢% بينما الاحتفاظ بالسهم حقق ١٥%.",
  },
  {
    id: "out-of-sample",
    ar: "العينة خارج الفترة",
    en: "Out-of-Sample",
    desc: "اختبار القاعدة على فترة زمنية منفصلة لم تُستخدم في ضبط إعداداتها، للتحقق من عدم الإفراط في الملاءمة.",
    example: "مثال: تدريب على أول ٧٠% من البيانات واختبار على آخر ٣٠%.",
  },
  {
    id: "backtest",
    ar: "الاختبار التاريخي (الرجعي)",
    en: "Backtest",
    desc: "تطبيق قاعدة تداول محددة على بيانات الماضي لقياس نتائجها التاريخية بالأرقام. الأداء السابق لا يضمن المستقبل.",
    example: "مثال: اختبار تقاطع متوسطين على آخر سنة من شموع سهم COMI.",
  },
  {
    id: "volatility",
    ar: "التذبذب",
    en: "Volatility",
    desc: "مقياس لمدى سرعة واتساع تحرك سعر السهم صعوداً وهبوطاً. التذبذب المرتفع يعني مخاطر أعلى.",
    example: "مثال: سهم يتحرك يومياً بمتوسط ٣% أكثر تذبذباً من سهم يتحرك ٠٫٥%.",
  },
  {
    id: "52w-range",
    ar: "نطاق ٥٢ أسبوعاً",
    en: "52-Week Range",
    desc: "أعلى سعر وأدنى سعر وصل إليهما السهم خلال آخر سنة تقريباً. يساعدك على معرفة موقع السعر الحالي مقارنة بسنة كاملة.",
    example: "مثال: أدنى سعر ٦٠ وأعلى سعر ١٠٠، والسعر الحالي ٩٠ يعني أنه قريب من القمة.",
  },
  {
    id: "prev-close",
    ar: "الإغلاق السابق",
    en: "Previous Close",
    desc: "آخر سعر تداول للسهم في جلسة التداول السابقة، ويُستخدم لحساب نسبة التغير اليومي.",
    example: "مثال: إغلاق أمس ٥٠ واليوم ٥١ يعني ارتفاعاً بمقدار +٢%.",
  },
  {
    id: "support-resistance",
    ar: "الدعم والمقاومة",
    en: "Support & Resistance",
    desc: "مستويات سعرية تاريخية تكرّر عندها توقف الهبوط (دعم) أو توقف الصعود (مقاومة).",
    example: "مثال: ارتداد السهم ثلاث مرات من سعر ٤٠ ج.م يجعله منطقة دعم تاريخية.",
  },
  {
    id: "gap",
    ar: "الفجوة السعرية",
    en: "Price Gap",
    desc: "فرق واضح بين إغلاق جلسة وافتتاح الجلسة التالية دون تداولات بينهما، غالباً بعد أخبار جوهرية.",
    example: "مثال: أغلق عند ٥٠ وافتتح في اليوم التالي عند ٥٣ ج.م.",
  },
  {
    id: "ranking",
    ar: "الترتيب التاريخي",
    en: "Historical Ranking",
    desc: "ترتيب وصفي للأسهم وفق أوزان شفافة يختارها المستخدم بناءً على الإحصاءات التاريخية، وليس توصية بالشراء أو البيع.",
    example: "مثال: إعطاء ٣٥% لنسبة النجاح و٣٠% لمتوسط العائد.",
  },
  {
    id: "confidence",
    ar: "درجة الثقة",
    en: "Confidence Level",
    desc: "تقييم مبدئي لقوة الإحصاءات يعتمد على عدد الصفقات وطول السجل المتاح. العينات أقل من ٣٠ صفقة تكون منخفضة الثقة.",
    example: "مثال: ٥ صفقات فقط = ثقة منخفضة؛ ٤٠ صفقة على سجل طويل = ثقة مرتفعة.",
  },
  {
    id: "levels",
    ar: "مستويات العرض (مبتدئ / متوسط / خبير)",
    en: "Investor Display Levels",
    desc: "ثلاث طرق لعرض نفس البيانات الحقيقية: مبتدئ بلغة يومية مبسطة، متوسط بالمؤشرات الأساسية، وخبير بكامل المعاملات والتصدير.",
    example: "مثال: يمكنك التبديل بينها في أي وقت من أعلى الصفحة.",
  },
  {
    id: "delay",
    ar: "تأخير البيانات ٣٠ دقيقة",
    en: "30-Minute Delay",
    desc: "الفارق الزمني الافتراضي لأسعار Mansa API مقارنة باللحظة الحالية في السوق، ويظهر بوضوح بجوار كل سعر.",
    example: "مثال: السعر المعروض يعكس آخر تحديث قبل نحو ٣٠ دقيقة خلال الجلسة.",
  },
];

export default function GlossaryPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalizeArabic(query);
    if (!q) return TERMS;
    return TERMS.filter(
      (t) =>
        normalizeArabic(t.ar).includes(q) ||
        normalizeArabic(t.en).includes(q) ||
        normalizeArabic(t.desc).includes(q)
    );
  }, [query]);

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
          شروح مبسّطة لكل مصطلح ومؤشر يظهر في الموقع مع مثال رقمي صغير.
        </p>

        <div className="relative mt-4 max-w-md">
          <Search className="pointer-events-none absolute top-2.5 right-3 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن مصطلح (مثل RSI أو تذبذب أو هبوط)..."
            className="w-full rounded-xl border border-slate-200 py-2 pr-9 pl-3 text-sm"
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filtered.map((t) => (
            <div
              key={t.id}
              id={t.id}
              className="scroll-mt-24 rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-bold text-slate-900">{t.ar}</h2>
                <span className="text-xs font-medium text-emerald-800">
                  <bdi dir="ltr">{t.en}</bdi>
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                {t.desc}
              </p>
              <p className="mt-2 rounded-lg bg-white px-3 py-1.5 text-xs text-slate-600">
                {t.example}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
