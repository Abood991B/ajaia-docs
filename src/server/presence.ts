import "server-only";
import { and, eq, gte, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { documentPresence, documentShares, users } from "@/db/schema";
import type { ViewerDto } from "@/lib/dto";

/** A viewer counts as "here" if they polled in the last two minutes. */
export const PRESENCE_WINDOW_MS = 120_000;

export async function touchPresence(
  documentId: string,
  userId: string,
): Promise<void> {
  await db
    .insert(documentPresence)
    .values({ documentId, userId, lastSeenAt: new Date() })
    .onConflictDoUpdate({
      target: [documentPresence.documentId, documentPresence.userId],
      set: { lastSeenAt: new Date() },
    });
}

export async function clearPresence(
  documentId: string,
  userId: string,
): Promise<void> {
  await db
    .delete(documentPresence)
    .where(
      and(
        eq(documentPresence.documentId, documentId),
        eq(documentPresence.userId, userId),
      ),
    );
}

export async function listViewers(
  documentId: string,
  excludeUserId: string,
  ownerId: string,
  windowMs = PRESENCE_WINDOW_MS,
): Promise<ViewerDto[]> {
  const cutoff = new Date(Date.now() - windowMs);

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      shareRole: documentShares.role,
    })
    .from(documentPresence)
    .innerJoin(users, eq(documentPresence.userId, users.id))
    .leftJoin(
      documentShares,
      and(
        eq(documentShares.documentId, documentPresence.documentId),
        eq(documentShares.userId, documentPresence.userId),
      ),
    )
    .where(
      and(
        eq(documentPresence.documentId, documentId),
        gte(documentPresence.lastSeenAt, cutoff),
        ne(documentPresence.userId, excludeUserId),
      ),
    );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.id === ownerId ? "OWNER" : (row.shareRole ?? "VIEWER"),
  }));
}
