/**
 * Access control is deliberately pure: no database, no framework, no request
 * context. Every read and every mutation in the app funnels through these
 * functions, which is why they are also the unit-test target.
 */

export type ShareRole = "VIEWER" | "EDITOR";
export type Role = "OWNER" | ShareRole;

export type DocumentRef = { ownerId: string };
export type ShareRef = { userId: string; role: ShareRole };

export const SHARE_ROLES: ShareRole[] = ["VIEWER", "EDITOR"];

export function resolveRole(
  document: DocumentRef,
  shares: readonly ShareRef[],
  userId: string,
): Role | null {
  if (document.ownerId === userId) return "OWNER";
  const share = shares.find((entry) => entry.userId === userId);
  return share ? share.role : null;
}

export function canRead(role: Role | null): boolean {
  return role !== null;
}

export function canEdit(role: Role | null): boolean {
  return role === "OWNER" || role === "EDITOR";
}

export function canManageSharing(role: Role | null): boolean {
  return role === "OWNER";
}

export function canDelete(role: Role | null): boolean {
  return role === "OWNER";
}

export function isShareRole(value: unknown): value is ShareRole {
  return value === "VIEWER" || value === "EDITOR";
}

export function roleLabel(role: Role): string {
  if (role === "OWNER") return "Owner";
  if (role === "EDITOR") return "Can edit";
  return "Can view";
}

/**
 * A document title is user input and shows up in lists and the page header.
 * Keep it single-line and bounded rather than rejecting the whole save.
 */
export function normalizeTitle(input: string): string {
  const collapsed = input.replace(/\s+/g, " ").trim();
  if (collapsed.length === 0) return "Untitled document";
  return collapsed.slice(0, 160);
}


