import { z } from "zod";
import { jsonOk, parseBody } from "@/lib/http";
import { requireUser } from "@/lib/guard";
import { toDocumentDto } from "@/lib/dto";
import { createDocument, listDocumentsForUser } from "@/server/documents";

const createSchema = z.object({
  title: z.string().max(200).optional(),
});

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const result = await listDocumentsForUser(auth.user.id);
  return jsonOk(result);
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseBody(request, createSchema);
  if (!parsed.ok) return parsed.response;

  const document = await createDocument(auth.user.id, {
    title: parsed.data.title ?? "Untitled document",
  });

  return jsonOk({ document: toDocumentDto(document) }, 201);
}
