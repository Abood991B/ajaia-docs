import { z } from "zod";
import { jsonError, jsonOk, parseBody } from "@/lib/http";
import { requireDocument, requireUser } from "@/lib/guard";
import { listShares, removeShare, upsertShare } from "@/server/documents";

const shareSchema = z.object({
  email: z.string().trim().min(3).max(320),
  role: z.enum(["VIEWER", "EDITOR"]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const access = await requireDocument(id, auth.user.id, "share");
  if (!access.ok) return access.response;

  return jsonOk({ shares: await listShares(id) });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const access = await requireDocument(id, auth.user.id, "share");
  if (!access.ok) return access.response;

  const parsed = await parseBody(request, shareSchema);
  if (!parsed.ok) return parsed.response;

  const result = await upsertShare(
    id,
    access.access.document.ownerId,
    parsed.data.email,
    parsed.data.role,
  );

  if (result.status === "user-not-found") {
    return jsonError(
      404,
      "NOT_FOUND",
      "No account with that email. Try one of the demo accounts listed below.",
    );
  }

  if (result.status === "is-owner") {
    return jsonError(400, "VALIDATION_FAILED", "The owner already has full access.");
  }

  return jsonOk({ shares: await listShares(id) });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const access = await requireDocument(id, auth.user.id, "share");
  if (!access.ok) return access.response;

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) {
    return jsonError(400, "VALIDATION_FAILED", "userId is required.");
  }

  await removeShare(id, userId);
  return jsonOk({ shares: await listShares(id) });
}
