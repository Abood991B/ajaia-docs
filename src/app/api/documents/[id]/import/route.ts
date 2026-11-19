import { toDocumentDto } from "@/lib/dto";
import { requireDocument, requireUser } from "@/lib/guard";
import { jsonError, jsonOk } from "@/lib/http";
import { ImportError, importFile } from "@/lib/import";
import { updateDocument } from "@/server/documents";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Insert a file into an existing document. The parsed content is appended to
 * the stored body; the client reloads the returned document, so the editor and
 * the database agree after the operation.
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const access = await requireDocument(id, auth.user.id, "edit");
  if (!access.ok) return access.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch (error) {
    console.error("Insert-file body was not readable multipart", error);
    return jsonError(400, "VALIDATION_FAILED", "Send the file as multipart form data.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError(400, "VALIDATION_FAILED", "Attach a file to insert.");
  }

  try {
    const imported = await importFile(file);
    const current = access.access.document;

    const updated = await updateDocument(
      id,
      {
        contentHtml: `${current.contentHtml}${imported.html}`,
        contentText: [current.contentText, imported.text].filter(Boolean).join(" "),
      },
      auth.user.id,
    );

    if (!updated || updated.status === "conflict") {
      return jsonError(
        409,
        "CONFLICT",
        "This document changed while the file was being inserted. Try again.",
      );
    }

    return jsonOk({ document: toDocumentDto(updated.document) });
  } catch (error) {
    if (error instanceof ImportError) {
      return jsonError(400, "IMPORT_FAILED", error.message);
    }
    console.error("Insert-file failed", error);
    return jsonError(500, "INTERNAL", "Something went wrong while inserting that file.");
  }
}
