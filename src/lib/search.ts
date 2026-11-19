/**
 * Server-side search over document titles and bodies. Kept pure so the matching
 * and snippet rules are testable without a database.
 */

export const MAX_QUERY_LENGTH = 120;

export function normalizeQuery(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

export function matchesQuery(haystack: string, query: string): boolean {
  const term = query.toLowerCase();
  if (!term) return false;
  return haystack.toLowerCase().includes(term);
}

/**
 * A short window around the first match, with ellipses on the cut sides.
 * Returns plain text — the caller renders it as a text node, never as HTML.
 */
export function searchSnippet(
  text: string,
  query: string,
  radius = 70,
): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  const term = query.toLowerCase();
  const index = collapsed.toLowerCase().indexOf(term);
  if (index === -1) return "";

  const start = Math.max(0, index - radius);
  const end = Math.min(collapsed.length, index + term.length + radius);

  let slice = collapsed.slice(start, end);
  if (start > 0) {
    const firstSpace = slice.indexOf(" ");
    if (firstSpace > 0 && firstSpace < 24) slice = slice.slice(firstSpace + 1);
    slice = `…${slice}`;
  }
  if (end < collapsed.length) {
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace > slice.length - 24) slice = slice.slice(0, lastSpace);
    slice = `${slice}…`;
  }

  return slice;
}
