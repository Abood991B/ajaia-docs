import { z } from "zod";
import { jsonError, jsonOk, parseBody } from "@/lib/http";
import { requireDocument, requireUser } from "@/lib/guard";
import { canDelete, canManageSharing } from "@/lib/access";
import { toDocumentDto } from "@/lib/dto";
import { scrubHtml, stripHtml } from "@/lib/text";
import { listShares, deleteDocument, updateDocument } from "@/server/documents";

const patchSchema = z
  .object({
    title: z.string().max(200).optional(),
    contentHtml: z.string().max(2_000_000).optional(),
    contentText: z.string().max(2_000_000).optional(),
    expectedUpdatedAt: z.number().int().nonnegative().optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.contentHtml !== undefined ||
      value.contentText !== undefined,
    { message: "Send at least one field to update." },
  );

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const result = await requireDocument(id, auth.user.id, "read");
  if (!result.ok) return result.response;

  return jsonOk({
    document: toDocumentDto(result.access.document),
    role: result.access.role,
    ownerName: result.access.ownerName,
    // The share list contains other people's emails; only the owner needs it.
    shares: canManageSharing(result.access.role) ? await listShares(id) : [],
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const access = await requireDocument(id, auth.user.id, "edit");
  if (!access.ok) return access.response;

  const parsed = await parseBody(request, patchSchema);
  if (!parsed.ok) return parsed.response;

  // The body is stored as HTML, so normalise it on the way in: drop handlers
  // and script/style blocks, and derive the plain-text projection from the
  // same bytes instead of trusting a second client-supplied field.
  const patch = { ...parsed.data };
  if (patch.contentHtml !== undefined) {
    patch.contentHtml = scrubHtml(patch.contentHtml);
    patch.contentText = stripHtml(patch.contentHtml);
  }

  const updated = await updateDocument(id, patch, auth.user.id);
  if (!updated) {
    return jsonError(404, "NOT_FOUND", "Document not found.");
  }

  if (updated.status === "conflict") {
    return jsonError(
      409,
      "CONFLICT",
      "This document was updated in another tab. Reload to get the latest version.",
    );
  }

  return jsonOk({ document: toDocumentDto(updated.document) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const access = await requireDocument(id, auth.user.id, "read");
  if (!access.ok) return access.response;

  if (!canDelete(access.access.role)) {
    return jsonError(403, "FORBIDDEN", "Only the owner can delete this document.");
  }

  await deleteDocument(id);
  return jsonOk({ ok: true });
}
