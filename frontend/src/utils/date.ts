/**
 * Parse a transaction date string to a local Date object.
 *
 * Handles both formats:
 * - ISO format with timezone: "2026-01-16T00:00:00Z"
 * - Date-only string: "2026-01-16"
 *
 * Always returns the date interpreted as local time to avoid timezone shifts
 * (e.g., a transaction on Jan 16 should show as Jan 16, not Jan 15 due to UTC conversion).
 */
export function parseTransactionDate(dateString: string): Date {
  // Extract just the date part (YYYY-MM-DD) regardless of format
  const datePart = dateString.split('T')[0];
  // Parse as local time by appending T00:00:00 (no Z)
  return new Date(datePart + 'T00:00:00');
}

/**
 * Format a date for display in Brazilian Portuguese format (DD/MM/YYYY).
 */
export function formatDateBR(dateString: string): string {
  return parseTransactionDate(dateString).toLocaleDateString('pt-BR');
}

/**
 * Get the month (1-12) and year from a transaction date string.
 */
export function getMonthYear(dateString: string): { month: number; year: number } {
  const date = parseTransactionDate(dateString);
  return {
    month: date.getMonth() + 1, // getMonth() returns 0-11
    year: date.getFullYear(),
  };
}

/**
 * Get the day of month (1-31) from a transaction date string.
 */
export function getDayOfMonth(dateString: string): number {
  return parseTransactionDate(dateString).getDate();
}
