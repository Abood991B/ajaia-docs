import { z } from "zod";
import { requireDocument, requireUser } from "@/lib/guard";
import { jsonError, jsonOk, parseBody } from "@/lib/http";
import { deleteComment, listComments, resolveComment } from "@/server/comments";

const patchSchema = z.object({
  resolved: z.literal(true),
});

type RouteContext = { params: Promise<{ id: string; commentId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id, commentId } = await context.params;
  const access = await requireDocument(id, auth.user.id, "edit");
  if (!access.ok) return access.response;

  const parsed = await parseBody(request, patchSchema);
  if (!parsed.ok) return parsed.response;

  const resolved = await resolveComment(id, commentId);
  if (!resolved) {
    return jsonError(404, "NOT_FOUND", "That comment no longer exists.");
  }

  return jsonOk({ comments: await listComments(id) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id, commentId } = await context.params;
  const access = await requireDocument(id, auth.user.id, "edit");
  if (!access.ok) return access.response;

  const result = await deleteComment(id, commentId, {
    id: auth.user.id,
    isOwner: access.access.role === "OWNER",
  });

  if (result === "not-found") {
    return jsonError(404, "NOT_FOUND", "That comment no longer exists.");
  }
  if (result === "forbidden") {
    return jsonError(
      403,
      "FORBIDDEN",
      "Only the author or the document owner can delete a comment.",
    );
  }

  return jsonOk({ comments: await listComments(id) });
}
