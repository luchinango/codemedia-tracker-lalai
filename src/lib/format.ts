/**
 * Format a number using Bolivian convention:
 * `.` as thousands separator, `,` as decimal separator.
 *
 * Example: 1234.56 → "1.234,56"
 */
export function fmtNum(value: number, decimals = 2): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format as Bolivianos: "Bs1.234,56" */
export function fmtBs(value: number): string {
  return `Bs${fmtNum(value)}`;
}

/** Format with dynamic currency symbol */
export function fmtCurrency(value: number, currency: string = "USD"): string {
  const symbol = currency === "BOB" ? "Bs" : "$";
  return `${symbol}${fmtNum(value)}`;
}
