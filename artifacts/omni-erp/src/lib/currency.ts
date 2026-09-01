const INR_LOCALE = "en-IN";

export function formatINR(value: number | string | null | undefined, compact = false): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "₹0";

  if (compact) {
    const absolute = Math.abs(amount);
    if (absolute >= 1_000_000) return `₹${(amount / 1_000_000).toFixed(1)}M`;
    if (absolute >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  }

  return new Intl.NumberFormat(INR_LOCALE, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: compact ? 0 : 2,
    minimumFractionDigits: compact ? 0 : 2,
  }).format(amount);
}

export function formatINRCompact(value: number | string | null | undefined): string {
  return formatINR(value, true);
}