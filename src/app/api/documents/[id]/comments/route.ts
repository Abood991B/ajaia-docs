import { z } from "zod";
import { COMMENT_ID_PATTERN } from "@/lib/comments";
import { requireDocument, requireUser } from "@/lib/guard";
import { jsonOk, parseBody } from "@/lib/http";
import { createComment, listComments } from "@/server/comments";

const createSchema = z.object({
  id: z.string().regex(COMMENT_ID_PATTERN, "Invalid comment id."),
  body: z.string().trim().min(1, "Write something first.").max(2000),
  quotedText: z.string().max(400).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const access = await requireDocument(id, auth.user.id, "read");
  if (!access.ok) return access.response;

  return jsonOk({ comments: await listComments(id) });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const access = await requireDocument(id, auth.user.id, "edit");
  if (!access.ok) return access.response;

  const parsed = await parseBody(request, createSchema);
  if (!parsed.ok) return parsed.response;

  await createComment(id, auth.user.id, {
    id: parsed.data.id,
    body: parsed.data.body,
    quotedText: parsed.data.quotedText ?? "",
  });

  return jsonOk({ comments: await listComments(id) }, 201);
}
