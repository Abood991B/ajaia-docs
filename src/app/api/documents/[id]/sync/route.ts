import { requireDocument, requireUser } from "@/lib/guard";
import { jsonOk } from "@/lib/http";
import { countUnresolvedComments } from "@/server/comments";
import { clearPresence, listViewers, touchPresence } from "@/server/presence";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Polled by the open editor. It is intentionally one small query per concern:
 * the document version, who else is here, and how many open comments exist.
 * The body itself is only fetched when the version actually changed.
 */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const access = await requireDocument(id, auth.user.id, "read");
  if (!access.ok) return access.response;

  await touchPresence(id, auth.user.id);

  const [viewers, unresolvedComments] = await Promise.all([
    listViewers(id, auth.user.id, access.access.document.ownerId),
    countUnresolvedComments(id),
  ]);

  return jsonOk({
    updatedAt: access.access.document.updatedAt.getTime(),
    viewers,
    unresolvedComments,
  });
}

/** Best-effort "I left the document" so the avatar disappears immediately. */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const access = await requireDocument(id, auth.user.id, "read");
  if (!access.ok) return access.response;

  await clearPresence(id, auth.user.id);
  return jsonOk({ ok: true });
}
