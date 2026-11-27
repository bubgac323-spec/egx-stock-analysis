export function formatNumber(
  n: number | null | undefined,
  opts: { decimals?: number; minDecimals?: number } = {}
): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  const decimals = opts.decimals ?? 2;
  const minDecimals = opts.minDecimals ?? decimals;
  return new Intl.NumberFormat("ar-EG", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatPrice(n: number | null | undefined): string {
  return formatNumber(n, { decimals: 2 });
}

export function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  return `\u200E${formatNumber(n, { decimals: 2 })}%`;
}

export function formatSignedPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `\u200E${sign}${formatNumber(Math.abs(n), { decimals: 2 })}%`;
}

export function formatVolume(
  n: number | null | undefined,
  compact = false
): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  if (compact) {
    if (Math.abs(n) >= 1_000_000) {
      return `${formatNumber(n / 1_000_000, { decimals: 2 })} مليون`;
    }
    if (Math.abs(n) >= 1_000) {
      return `${formatNumber(n / 1_000, { decimals: 1 })} ألف`;
    }
  }
  return formatNumber(n, { decimals: 0 });
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "-";
  try {
    const d = typeof iso === "string" ? new Date(iso) : iso;
    if (Number.isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("ar-EG", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return "-";
  }
}

export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "-";
  try {
    const d = typeof iso === "string" ? new Date(iso) : iso;
    if (Number.isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("ar-EG", {
      timeZone: "Africa/Cairo",
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  } catch {
    return "-";
  }
}

export function toCairoDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}
