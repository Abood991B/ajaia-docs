import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { documentVersions, users, type DocumentRow } from "@/db/schema";
import { newId } from "@/db/seed";
import type { VersionDto, VersionSummaryDto } from "@/lib/dto";
import { pickVersionsToDrop } from "@/lib/versions";
import { countWords } from "@/lib/text";

export const VERSION_LIMIT = 30;

export async function snapshotVersion(
  document: DocumentRow,
  createdBy: string | null,
): Promise<void> {
  await db.insert(documentVersions).values({
    id: newId("ver"),
    documentId: document.id,
    title: document.title,
    contentHtml: document.contentHtml,
    contentText: document.contentText,
    createdBy,
    createdAt: new Date(),
  });

  await pruneVersions(document.id);
}

/** Keeps the window bounded so a long editing session cannot grow forever. */
export async function pruneVersions(
  documentId: string,
  limit = VERSION_LIMIT,
): Promise<void> {
  const rows = await db
    .select({
      id: documentVersions.id,
      createdAt: documentVersions.createdAt,
    })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId));

  const drop = pickVersionsToDrop(
    rows.map((row) => ({ id: row.id, createdAt: row.createdAt.getTime() })),
    limit,
  );

  if (drop.length > 0) {
    await db.delete(documentVersions).where(inArray(documentVersions.id, drop));
  }
}

export async function listVersions(
  documentId: string,
): Promise<VersionSummaryDto[]> {
  const rows = await db
    .select({
      id: documentVersions.id,
      title: documentVersions.title,
      contentText: documentVersions.contentText,
      createdAt: documentVersions.createdAt,
      authorName: users.name,
    })
    .from(documentVersions)
    .leftJoin(users, eq(documentVersions.createdBy, users.id))
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.createdAt))
    .limit(VERSION_LIMIT);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    wordCount: countWords(row.contentText),
    authorName: row.authorName ?? "Removed account",
    createdAt: row.createdAt.getTime(),
  }));
}

export async function getVersion(
  documentId: string,
  versionId: string,
): Promise<VersionDto | null> {
  const rows = await db
    .select({
      id: documentVersions.id,
      title: documentVersions.title,
      contentHtml: documentVersions.contentHtml,
      contentText: documentVersions.contentText,
      createdAt: documentVersions.createdAt,
      authorName: users.name,
    })
    .from(documentVersions)
    .leftJoin(users, eq(documentVersions.createdBy, users.id))
    .where(
      and(
        eq(documentVersions.id, versionId),
        eq(documentVersions.documentId, documentId),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    wordCount: countWords(row.contentText),
    authorName: row.authorName ?? "Removed account",
    createdAt: row.createdAt.getTime(),
    contentHtml: row.contentHtml,
    contentText: row.contentText,
  };
}
