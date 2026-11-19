import { jsonError, jsonOk } from "@/lib/http";
import { requireUser } from "@/lib/guard";
import { toDocumentDto } from "@/lib/dto";
import { createDocument } from "@/server/documents";
import { ImportError, importFile } from "@/lib/import";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "VALIDATION_FAILED", "Send the file as multipart form data.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError(400, "VALIDATION_FAILED", "Attach a file to import.");
  }

  try {
    const imported = await importFile(file);
    const document = await createDocument(auth.user.id, {
      title: imported.title,
      html: imported.html,
      text: imported.text,
    });

    return jsonOk({ document: toDocumentDto(document) }, 201);
  } catch (error) {
    if (error instanceof ImportError) {
      return jsonError(400, "IMPORT_FAILED", error.message);
    }
    console.error("Import failed", error);
    return jsonError(500, "INTERNAL", "Something went wrong while importing that file.");
  }
}
