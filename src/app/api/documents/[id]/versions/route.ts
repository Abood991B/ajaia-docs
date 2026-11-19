import { requireDocument, requireUser } from "@/lib/guard";
import { jsonOk } from "@/lib/http";
import { listVersions } from "@/server/versions";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const access = await requireDocument(id, auth.user.id, "read");
  if (!access.ok) return access.response;

  return jsonOk({
    versions: await listVersions(id),
    currentUpdatedAt: access.access.document.updatedAt.getTime(),
  });
}
