export const FORBIDDEN_PHRASES = [
  "مضمون",
  "99%",
  "توصية مؤكدة",
  "ربح أكيد",
  "فرصة لا تتكرر",
  "سيصعد",
  "سيهبط",
  "اشترِ الآن",
  "بِع الآن",
  "صحيح 100%",
] as const;

export const PERMANENT_DISCLAIMER =
  "المحتوى تحليل ومعلومات فقط، وليس نصيحة استثمارية ولا توصية بالشراء أو البيع. القرار والمسؤولية على المستخدم.";

export const RANKING_DISCLAIMER =
  "ترتيب وصفي مبني على أداء تاريخي، وليس توصية بالشراء أو البيع، ولا يضمن نتيجة مستقبلية.";

export const PAST_PERFORMANCE_NOTE =
  "الأداء التاريخي لا يضمن المستقبل.";

export function findForbiddenPhrases(text: string): string[] {
  return FORBIDDEN_PHRASES.filter((phrase) => text.includes(phrase));
}
