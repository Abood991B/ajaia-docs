import "server-only";
import { and, desc, eq, like, or } from "drizzle-orm";
import { db } from "@/db/client";
import {
  documentComments,
  documentPresence,
  documentShares,
  documentVersions,
  documents,
  users,
  type DocumentRow,
  type DocumentShareRow,
} from "@/db/schema";
import { newId } from "@/db/seed";
import {
  normalizeTitle,
  resolveRole,
  type Role,
  type ShareRole,
} from "@/lib/access";
import { countWords, excerpt } from "@/lib/text";
import { normalizeQuery, searchSnippet } from "@/lib/search";
import { shouldSnapshot } from "@/lib/versions";
import { snapshotVersion } from "@/server/versions";
import type { ShareDto } from "@/lib/dto";

export type DocumentSummary = {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: number;
  wordCount: number;
  role: Role;
  ownerName: string;
  isOwned: boolean;
};

export type ShareEntry = ShareDto;

export type DocumentAccess = {
  document: DocumentRow;
  role: Role;
  ownerName: string;
  shares: DocumentShareRow[];
};

function toSummary(
  row: DocumentRow,
  role: Role,
  ownerName: string,
): DocumentSummary {
  return {
    id: row.id,
    title: row.title,
    excerpt: excerptWithoutTitle(row.title, row.contentText),
    updatedAt: row.updatedAt.getTime(),
    wordCount: countWords(row.contentText),
    role,
    ownerName,
    isOwned: role === "OWNER",
  };
}

/**
 * The first heading of a document usually repeats its title, so a naive
 * excerpt shows the same words twice on the card. Drop the leading repeat.
 */
function excerptWithoutTitle(title: string, text: string): string {
  const trimmed = text.trim();
  const normalizedTitle = title.trim().toLowerCase();
  const body = trimmed.toLowerCase().startsWith(normalizedTitle)
    ? trimmed.slice(title.trim().length).replace(/^[\s—–:-]+/, "")
    : trimmed;
  return excerpt(body, 150);
}

export async function listDocumentsForUser(
  userId: string,
): Promise<{ owned: DocumentSummary[]; shared: DocumentSummary[] }> {
  const ownedRows = await db
    .select({ document: documents, ownerName: users.name })
    .from(documents)
    .innerJoin(users, eq(documents.ownerId, users.id))
    .where(eq(documents.ownerId, userId))
    .orderBy(desc(documents.updatedAt));

  const sharedRows = await db
    .select({
      document: documents,
      ownerName: users.name,
      role: documentShares.role,
    })
    .from(documentShares)
    .innerJoin(documents, eq(documentShares.documentId, documents.id))
    .innerJoin(users, eq(documents.ownerId, users.id))
    .where(eq(documentShares.userId, userId))
    .orderBy(desc(documents.updatedAt));

  return {
    owned: ownedRows.map((row) => toSummary(row.document, "OWNER", row.ownerName)),
    shared: sharedRows.map((row) =>
      toSummary(row.document, row.role, row.ownerName),
    ),
  };
}

/**
 * Search runs in SQL over title and body rather than in the browser over a
 * truncated excerpt, so a match deep inside a document is still findable.
 * LIKE wildcards are stripped from the term: they are not meaningful in a
 * search box and would turn `%` into a full-table match.
 */
export async function searchDocumentsForUser(
  userId: string,
  rawQuery: string,
): Promise<{ owned: DocumentSummary[]; shared: DocumentSummary[]; query: string }> {
  const term = normalizeQuery(rawQuery);
  const needle = term.replace(/[%_]/g, " ").trim();
  if (!needle) {
    return { ...(await listDocumentsForUser(userId)), query: term };
  }

  const pattern = `%${needle}%`;
  const where = or(
    like(documents.title, pattern),
    like(documents.contentText, pattern),
  );

  const ownedRows = await db
    .select({ document: documents, ownerName: users.name })
    .from(documents)
    .innerJoin(users, eq(documents.ownerId, users.id))
    .where(and(eq(documents.ownerId, userId), where))
    .orderBy(desc(documents.updatedAt));

  const sharedRows = await db
    .select({
      document: documents,
      ownerName: users.name,
      role: documentShares.role,
    })
    .from(documentShares)
    .innerJoin(documents, eq(documentShares.documentId, documents.id))
    .innerJoin(users, eq(documents.ownerId, users.id))
    .where(and(eq(documentShares.userId, userId), where))
    .orderBy(desc(documents.updatedAt));

  const withSnippet = (
    row: { document: DocumentRow; ownerName: string },
    role: Role,
  ): DocumentSummary => {
    const summary = toSummary(row.document, role, row.ownerName);
    const snippet =
      searchSnippet(row.document.contentText, needle) ||
      searchSnippet(row.document.title, needle);
    return snippet ? { ...summary, excerpt: snippet } : summary;
  };

  return {
    owned: ownedRows.map((row) => withSnippet(row, "OWNER")),
    shared: sharedRows.map((row) => withSnippet(row, row.role)),
    query: term,
  };
}

/**
 * Single entry point for reading a document. Returns null both when the
 * document does not exist and when the caller has no access, so the API can
 * answer 404 in either case instead of leaking existence.
 */
export async function getDocumentForUser(
  documentId: string,
  userId: string,
): Promise<DocumentAccess | null> {
  const rows = await db
    .select({ document: documents, ownerName: users.name })
    .from(documents)
    .innerJoin(users, eq(documents.ownerId, users.id))
    .where(eq(documents.id, documentId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const shares = await db
    .select()
    .from(documentShares)
    .where(eq(documentShares.documentId, documentId));

  const role = resolveRole(row.document, shares, userId);
  if (!role) return null;

  return {
    document: row.document,
    role,
    ownerName: row.ownerName,
    shares,
  };
}

export async function createDocument(
  ownerId: string,
  input: { title?: string; html?: string; text?: string },
): Promise<DocumentRow> {
  const timestamp = new Date();
  const row: DocumentRow = {
    id: newId("doc"),
    ownerId,
    title: normalizeTitle(input.title ?? "Untitled document"),
    contentHtml: input.html ?? "<p></p>",
    contentText: input.text ?? "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.insert(documents).values(row);
  return row;
}

export type UpdatePatch = {
  title?: string;
  contentHtml?: string;
  contentText?: string;
  expectedUpdatedAt?: number;
};

export type UpdateResult =
  | { status: "updated"; document: DocumentRow }
  | { status: "conflict"; document: DocumentRow };

export async function updateDocument(
  documentId: string,
  patch: UpdatePatch,
  actorId: string | null = null,
): Promise<UpdateResult | null> {
  const existing = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  const current = existing[0];
  if (!current) return null;

  if (
    typeof patch.expectedUpdatedAt === "number" &&
    current.updatedAt.getTime() !== patch.expectedUpdatedAt
  ) {
    return { status: "conflict", document: current };
  }

  const next: Partial<DocumentRow> = { updatedAt: new Date() };
  if (typeof patch.title === "string") next.title = normalizeTitle(patch.title);
  if (typeof patch.contentHtml === "string") next.contentHtml = patch.contentHtml;
  if (typeof patch.contentText === "string") next.contentText = patch.contentText;

  const updated = await db
    .update(documents)
    .set(next)
    .where(eq(documents.id, documentId))
    .returning();

  // Every body save is a restore point. Title-only renames are not.
  if (shouldSnapshot(patch)) {
    await snapshotVersion(updated[0], actorId);
  }

  return { status: "updated", document: updated[0] };
}

export async function deleteDocument(documentId: string): Promise<void> {
  // SQLite does not enforce ON DELETE CASCADE unless the pragma is on, and
  // libSQL leaves it off by default, so children are removed explicitly.
  await db.delete(documentComments).where(eq(documentComments.documentId, documentId));
  await db.delete(documentVersions).where(eq(documentVersions.documentId, documentId));
  await db.delete(documentPresence).where(eq(documentPresence.documentId, documentId));
  await db.delete(documentShares).where(eq(documentShares.documentId, documentId));
  await db.delete(documents).where(eq(documents.id, documentId));
}

export async function listShares(documentId: string): Promise<ShareEntry[]> {
  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: documentShares.role,
      createdAt: documentShares.createdAt,
    })
    .from(documentShares)
    .innerJoin(users, eq(documentShares.userId, users.id))
    .where(eq(documentShares.documentId, documentId));

  return rows.map((row) => ({
    userId: row.userId,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt.getTime(),
  }));
}

export type ShareMutationResult =
  | { status: "ok" }
  | { status: "user-not-found" }
  | { status: "is-owner" };

export async function upsertShare(
  documentId: string,
  ownerId: string,
  email: string,
  role: ShareRole,
): Promise<ShareMutationResult> {
  const normalized = email.trim().toLowerCase();
  const found = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);

  const target = found[0];
  if (!target) return { status: "user-not-found" };
  if (target.id === ownerId) return { status: "is-owner" };

  await db
    .insert(documentShares)
    .values({
      id: newId("shr"),
      documentId,
      userId: target.id,
      role,
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [documentShares.documentId, documentShares.userId],
      set: { role },
    });

  return { status: "ok" };
}

export async function removeShare(
  documentId: string,
  userId: string,
): Promise<void> {
  await db
    .delete(documentShares)
    .where(
      and(
        eq(documentShares.documentId, documentId),
        eq(documentShares.userId, userId),
      ),
    );
}
