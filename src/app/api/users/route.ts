import { jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/guard";
import { listOtherUsers } from "@/server/users";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const directory = await listOtherUsers(auth.user.id);
  return jsonOk({ users: directory });
}
