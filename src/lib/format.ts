/** Relative timestamps for the editor chrome. Client-side only. */
export function relativeTime(input: number | Date, now = Date.now()): string {
  const value = input instanceof Date ? input.getTime() : input;
  const seconds = Math.round((now - value) / 1000);

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDate(input: number | Date): string {
  const value = input instanceof Date ? input : new Date(input);
  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
