/**
 * Comment ids are generated on the client because the id has to be written
 * into the document HTML (as a mark) before the comment row exists. The server
 * re-validates the shape so a client cannot inject an arbitrary id.
 */
export const COMMENT_ID_PATTERN = /^cmt_[a-z0-9]{8,32}$/i;

export function newCommentId(): string {
  const uuid =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(16).slice(2).padEnd(32, "0");
  return `cmt_${uuid.replace(/-/g, "").slice(0, 24)}`;
}

export function isValidCommentId(value: unknown): value is string {
  return typeof value === "string" && COMMENT_ID_PATTERN.test(value);
}

/** One-line preview for the collapsed comment list. */
export function commentPreview(body: string, max = 96): string {
  const collapsed = body.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;
  return `${collapsed.slice(0, max).trimEnd()}…`;
}

export function countUnresolved(
  comments: readonly { resolvedAt: number | null }[],
): number {
  return comments.filter((comment) => comment.resolvedAt === null).length;
}

/** Oldest first: a thread reads like a conversation. */
export function sortComments<T extends { createdAt: number }>(comments: T[]): T[] {
  return [...comments].sort((a, b) => a.createdAt - b.createdAt);
}
