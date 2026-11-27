"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatSignedPercent,
} from "@/lib/format";

export function Num({
  value,
  decimals = 2,
  className = "",
}: {
  value: number | null | undefined;
  decimals?: number;
  className?: string;
}) {
  return (
    <span
      dir="ltr"
      style={{ unicodeBidi: "isolate" }}
      className={`inline-block ${className}`}
    >
      {formatNumber(value, { decimals })}
    </span>
  );
}

export function Pct({
  value,
  signed = true,
  className = "",
}: {
  value: number | null | undefined;
  signed?: boolean;
  className?: string;
}) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className={className}>-</span>;
  }
  const text = signed
    ? formatSignedPercent(value)
    : `\u200E${formatNumber(value, { decimals: 2 })}%`;
  return (
    <span
      dir="ltr"
      style={{ unicodeBidi: "isolate" }}
      className={`inline-block ${className}`}
    >
      {text}
    </span>
  );
}

export function ClientDateTime({
  value,
  dateOnly = false,
  fallback = "غير متاح بعد",
  className = "",
}: {
  value: string | null | undefined;
  dateOnly?: boolean;
  fallback?: string;
  className?: string;
}) {
  const [text, setText] = useState<string>("...");

  useEffect(() => {
    if (!value) {
      setText(fallback);
      return;
    }
    setText(dateOnly ? formatDate(value) : formatDateTime(value));
  }, [value, dateOnly, fallback]);

  return (
    <span suppressHydrationWarning className={className}>
      {text}
    </span>
  );
}

const TERM_HINTS: Record<string, string> = {
  sma: "المتوسط المتحرك البسيط: متوسط سعر الإغلاق لعدد محدد من الأيام لتوضيح الاتجاه.",
  ema: "المتوسط المتحرك الأسي: متوسط يعطي وزناً أكبر للأسعار الأحدث.",
  rsi: "مؤشر القوة النسبية (0–100): يقيس سرعة الصعود أو النزول الأخير.",
  macd: "مؤشر زخم يقارن بين متوسطين متحركين لقياس تغيّر قوة الحركة.",
  bollinger: "نطاقات بولينجر: قناة حول المتوسط تتسع مع زيادة التذبذب وتضيق مع هدوئه.",
  volume: "كمية الأسهم التي تم تداولها خلال اليوم.",
  "volume-ratio": "مقارنة حجم تداول اليوم بمتوسط آخر 20 يوماً.",
  "win-rate": "نسبة الصفقات الرابحة من إجمالي الصفقات في الاختبار التاريخي.",
  drawdown: "أكبر هبوط متواصل من أعلى قمة إلى أدنى قاع خلال الفترة.",
  backtest: "تجربة قاعدة تداول على بيانات الماضي لقياس نتائجها التاريخية.",
  "out-of-sample": "اختبار القاعدة على فترة زمنية لم تُستخدم في ضبطها.",
  volatility: "مقياس لمدى سرعة واتساع تغيّر سعر السهم يومياً.",
  "52w-range": "أعلى وأدنى سعر وصل إليه السهم خلال آخر 52 أسبوعاً.",
  confidence: "تقييم مبدئي لقوة الإحصاءات بناءً على عدد الصفقات وطول السجل.",
};

export function Term({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hint = TERM_HINTS[id] ?? "انقر لقراءة شرح المصطلح في القاموس.";

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        className="cursor-help border-b border-dotted border-emerald-700 font-medium text-emerald-900"
      >
        <bdi dir="auto">{children}</bdi>
      </button>
      {open && (
        <span className="absolute right-0 bottom-full z-30 mb-1.5 block w-60 rounded-xl border border-slate-200 bg-slate-900 p-2.5 text-right text-xs leading-relaxed text-white shadow-lg">
          <span className="block">{hint}</span>
          <Link
            href={`/glossary#${id}`}
            className="mt-1 inline-block text-emerald-300 underline"
          >
            اقرأ المزيد في القاموس
          </Link>
        </span>
      )}
    </span>
  );
}
