/**
 * truncateText - Truncate text to specified length with ellipsis
 * 
 * Truncates text to a maximum length and adds ellipsis if truncated.
 * Preserves word boundaries when possible.
 * 
 * @example
 * truncateText("This is a long text", 10) // "This is a..."
 * truncateText("Short", 10) // "Short"
 */

/**
 * Truncate text to specified length with ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length (including ellipsis)
 * @param preserveWords - If true, try to preserve word boundaries (default: true)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(
  text: string,
  maxLength: number,
  preserveWords: boolean = true
): string {
  // Guard: empty or invalid input
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Guard: text is already short enough
  if (text.length <= maxLength) {
    return text.trim();
  }

  // Guard: maxLength too short for ellipsis
  if (maxLength < 4) {
    return text.slice(0, maxLength);
  }

  const trimmed = text.trim();
  const ellipsis = '...';
  const availableLength = maxLength - ellipsis.length;

  if (preserveWords) {
    // Try to preserve word boundaries
    const truncated = trimmed.slice(0, availableLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');

    // If we found a space and it's not too close to the start, use it
    if (lastSpaceIndex > availableLength * 0.5) {
      return truncated.slice(0, lastSpaceIndex) + ellipsis;
    }
  }

  // Fallback: hard truncate
  return trimmed.slice(0, availableLength) + ellipsis;
}

