import "server-only";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { documentComments, users } from "@/db/schema";
import type { CommentDto } from "@/lib/dto";

const MAX_BODY = 2000;

export async function listComments(documentId: string): Promise<CommentDto[]> {
  const rows = await db
    .select({
      id: documentComments.id,
      authorId: documentComments.authorId,
      authorName: users.name,
      body: documentComments.body,
      quotedText: documentComments.quotedText,
      resolvedAt: documentComments.resolvedAt,
      createdAt: documentComments.createdAt,
    })
    .from(documentComments)
    .innerJoin(users, eq(documentComments.authorId, users.id))
    .where(eq(documentComments.documentId, documentId))
    .orderBy(asc(documentComments.createdAt));

  return rows.map((row) => ({
    id: row.id,
    authorId: row.authorId,
    authorName: row.authorName,
    body: row.body,
    quotedText: row.quotedText,
    resolvedAt: row.resolvedAt ? row.resolvedAt.getTime() : null,
    createdAt: row.createdAt.getTime(),
  }));
}

/** Cheap count for the polling endpoint: no bodies, no join. */
export async function countUnresolvedComments(
  documentId: string,
): Promise<number> {
  const rows = await db
    .select({ count: count() })
    .from(documentComments)
    .where(
      and(
        eq(documentComments.documentId, documentId),
        isNull(documentComments.resolvedAt),
      ),
    );

  return Number(rows[0]?.count ?? 0);
}

export async function createComment(  documentId: string,
  authorId: string,
  input: { id: string; body: string; quotedText: string },
): Promise<CommentDto> {
  const body = input.body.trim().slice(0, MAX_BODY);
  const quotedText = input.quotedText.replace(/\s+/g, " ").trim().slice(0, 400);

  await db
    .insert(documentComments)
    .values({
      id: input.id,
      documentId,
      authorId,
      body,
      quotedText,
      resolvedAt: null,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  const rows = await db
    .select({
      id: documentComments.id,
      authorId: documentComments.authorId,
      authorName: users.name,
      body: documentComments.body,
      quotedText: documentComments.quotedText,
      resolvedAt: documentComments.resolvedAt,
      createdAt: documentComments.createdAt,
    })
    .from(documentComments)
    .innerJoin(users, eq(documentComments.authorId, users.id))
    .where(eq(documentComments.id, input.id))
    .limit(1);

  const row = rows[0];
  return {
    id: row.id,
    authorId: row.authorId,
    authorName: row.authorName,
    body: row.body,
    quotedText: row.quotedText,
    resolvedAt: row.resolvedAt ? row.resolvedAt.getTime() : null,
    createdAt: row.createdAt.getTime(),
  };
}

export async function resolveComment(
  documentId: string,
  commentId: string,
): Promise<boolean> {
  const updated = await db
    .update(documentComments)
    .set({ resolvedAt: new Date() })
    .where(
      and(
        eq(documentComments.id, commentId),
        eq(documentComments.documentId, documentId),
      ),
    )
    .returning({ id: documentComments.id });

  return updated.length > 0;
}

export type DeleteCommentResult = "ok" | "not-found" | "forbidden";

/**
 * Authors can delete their own comments; the document owner can moderate any
 * comment on their document. Editors cannot delete each other's comments.
 */
export async function deleteComment(
  documentId: string,
  commentId: string,
  actor: { id: string; isOwner: boolean },
): Promise<DeleteCommentResult> {
  const rows = await db
    .select({ authorId: documentComments.authorId })
    .from(documentComments)
    .where(
      and(
        eq(documentComments.id, commentId),
        eq(documentComments.documentId, documentId),
      ),
    )
    .limit(1);

  const comment = rows[0];
  if (!comment) return "not-found";
  if (comment.authorId !== actor.id && !actor.isOwner) return "forbidden";

  await db.delete(documentComments).where(eq(documentComments.id, commentId));
  return "ok";
}
