import { ARABIC_NAMES } from "./arabic-names";

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeArabic(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "") // remove tashkeel & tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC_DIGITS.indexOf(d)));
}

export function matchStock(
  query: string,
  stock: { ticker: string; nameAr?: string | null; nameEn?: string | null }
): boolean {
  const q = normalizeArabic(query);
  if (!q) return true;

  const ticker = stock.ticker.toUpperCase();
  if (normalizeArabic(ticker).includes(q)) return true;
  if (stock.nameAr && normalizeArabic(stock.nameAr).includes(q)) return true;
  if (stock.nameEn && normalizeArabic(stock.nameEn).includes(q)) return true;

  const entry = ARABIC_NAMES[ticker];
  if (entry) {
    if (normalizeArabic(entry.ar).includes(q)) return true;
    if (entry.aliases?.some((a) => normalizeArabic(a).includes(q))) return true;
  }
  return false;
}
