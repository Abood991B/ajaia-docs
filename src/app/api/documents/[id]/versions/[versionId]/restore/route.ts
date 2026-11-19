import { z } from "zod";
import { requireDocument, requireUser } from "@/lib/guard";
import { jsonError, jsonOk, parseBody } from "@/lib/http";
import { toDocumentDto } from "@/lib/dto";
import { getVersion } from "@/server/versions";
import { updateDocument } from "@/server/documents";

const restoreSchema = z.object({
  expectedUpdatedAt: z.number().int().nonnegative().optional(),
});

type RouteContext = { params: Promise<{ id: string; versionId: string }> };

/**
 * Restoring writes the old body over the current one as a new save, so the
 * state you restored from stays in the history. Content only: a document that
 * was renamed after the snapshot keeps its current name.
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id, versionId } = await context.params;
  const access = await requireDocument(id, auth.user.id, "edit");
  if (!access.ok) return access.response;

  const parsed = await parseBody(request, restoreSchema);
  if (!parsed.ok) return parsed.response;

  const version = await getVersion(id, versionId);
  if (!version) {
    return jsonError(404, "NOT_FOUND", "That version no longer exists.");
  }

  const updated = await updateDocument(
    id,
    {
      contentHtml: version.contentHtml,
      contentText: version.contentText,
      expectedUpdatedAt: parsed.data.expectedUpdatedAt,
    },
    auth.user.id,
  );

  if (!updated) {
    return jsonError(404, "NOT_FOUND", "Document not found.");
  }

  if (updated.status === "conflict") {
    return jsonError(
      409,
      "CONFLICT",
      "This document changed since you opened the history. Reload and try again.",
    );
  }

  return jsonOk({ document: toDocumentDto(updated.document) });
}
