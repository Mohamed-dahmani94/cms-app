// Utility functions for currency conversion
// 1 Euro (EUR) = 150 Algerian Dinar (DZD) – approximate rate
export const EUR_TO_DZD_RATE = 150;

/**
 * Convert euros to Algerian Dinars.
 * @param eur amount in euros
 * @returns amount in DZD (rounded to nearest integer)
 */
export function eurToDzd(eur: number): number {
    return Math.round(eur * EUR_TO_DZD_RATE);
}

/**
 * Format a number as a currency string.
 * @param amount numeric amount
 * @param currency "EUR" | "DZD"
 */
export function formatCurrency(amount: number, currency: "EUR" | "DZD"): string {
    const formatter = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: currency === "EUR" ? "EUR" : "DZD",
        minimumFractionDigits: 0,
    });
    return formatter.format(amount);
}

/**
 * Format a number as a compact currency string (e.g., "1.5 M").
 * @param amount numeric amount
 * @param currency "EUR" | "DZD"
 */
export function formatCompactCurrency(amount: number, currency: "EUR" | "DZD"): string {
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(2) + " M";
    }
    return formatCurrency(amount, currency);
}
