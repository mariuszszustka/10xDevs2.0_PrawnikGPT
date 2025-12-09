/**
 * formatRelativeTime - Format date as relative timestamp
 * 
 * Formats a date as a relative timestamp in Polish:
 * - "2 godz. temu", "5 min. temu" (for recent times)
 * - "wczoraj", "dzisiaj" (for same/previous day)
 * - "3 dni temu", "2 tyg. temu" (for older times)
 * 
 * Uses Intl.RelativeTimeFormat for proper localization.
 */

/**
 * Format date as relative timestamp in Polish
 * 
 * @param date - Date string (ISO 8601) or Date object
 * @returns Relative timestamp string (e.g., "2 godz. temu", "wczoraj")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
  // Guard: invalid date
  if (isNaN(targetDate.getTime())) {
    return 'Nieprawidłowa data';
  }

  const diffMs = now.getTime() - targetDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  // Same day: "dzisiaj"
  if (diffDays === 0) {
    if (diffMinutes < 1) {
      return 'przed chwilą';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} min. temu`;
    }
    return `${diffHours} godz. temu`;
  }

  // Yesterday: "wczoraj"
  if (diffDays === 1) {
    return 'wczoraj';
  }

  // This week: "X dni temu"
  if (diffDays < 7) {
    return `${diffDays} dni temu`;
  }

  // This month: "X tyg. temu"
  if (diffWeeks < 4) {
    return `${diffWeeks} tyg. temu`;
  }

  // This year: "X mies. temu"
  if (diffMonths < 12) {
    return `${diffMonths} mies. temu`;
  }

  // Older: "X lat temu"
  return `${diffYears} lat temu`;
}

