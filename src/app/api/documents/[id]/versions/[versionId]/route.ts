import { requireDocument, requireUser } from "@/lib/guard";
import { jsonError, jsonOk } from "@/lib/http";
import { getVersion } from "@/server/versions";

type RouteContext = { params: Promise<{ id: string; versionId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id, versionId } = await context.params;
  const access = await requireDocument(id, auth.user.id, "read");
  if (!access.ok) return access.response;

  const version = await getVersion(id, versionId);
  if (!version) {
    return jsonError(404, "NOT_FOUND", "That version no longer exists.");
  }

  return jsonOk({ version });
}
