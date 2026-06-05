/** Money formatted in AED (the dashboard's base currency). */
export function formatAED(n: number | null | undefined): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(n ?? 0);
}

export function formatCurrency(
  n: number | null | undefined,
  currency = "AED",
): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n ?? 0);
}

export function formatNumber(n: number | null | undefined): string {
  return new Intl.NumberFormat("en-US").format(n ?? 0);
}

export function formatWeight(kg: number | null | undefined): string {
  if (kg == null) return "—";
  return `${Number(kg).toLocaleString("en-US", { maximumFractionDigits: 1 })} kg`;
}

/** Convert a snake_case enum value to "Title Case" for display. */
export function titleize(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
