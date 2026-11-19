/**
 * Version retention is a pure decision so it can be tested without a database:
 * given the stored snapshots, which ids fall outside the window? The returned
 * ids are ordered newest first, which makes the drop deterministic.
 */
export type VersionRef = { id: string; createdAt: number };

export function pickVersionsToDrop<T extends VersionRef>(
  rows: readonly T[],
  limit: number,
): string[] {
  const ordered = [...rows].sort((a, b) => {
    if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
    return b.id.localeCompare(a.id);
  });

  if (limit < 1) return ordered.map((row) => row.id);
  return ordered.slice(limit).map((row) => row.id);
}

/**
 * A snapshot is only meaningful when the body changed. Renaming a document
 * should not push a version out of the window.
 */
export function shouldSnapshot(patch: {
  title?: string;
  contentHtml?: string;
  contentText?: string;
}): boolean {
  return patch.contentHtml !== undefined || patch.contentText !== undefined;
}
