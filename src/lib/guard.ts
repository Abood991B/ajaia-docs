import "server-only";
import type { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getCurrentUser, type SessionUser } from "@/lib/session";
import { canEdit, canManageSharing, canRead, type Role } from "@/lib/access";
import { getDocumentForUser, type DocumentAccess } from "@/server/documents";

export async function requireUser(): Promise<
  { ok: true; user: SessionUser } | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: jsonError(401, "UNAUTHENTICATED", "Sign in to continue."),
    };
  }
  return { ok: true, user };
}

export async function requireDocument(
  documentId: string,
  userId: string,
  minimum: "read" | "edit" | "share",
): Promise<
  { ok: true; access: DocumentAccess } | { ok: false; response: NextResponse }
> {
  const access = await getDocumentForUser(documentId, userId);

  if (!access) {
    return {
      ok: false,
      response: jsonError(404, "NOT_FOUND", "Document not found."),
    };
  }

  const allowed = (role: Role) => {
    if (minimum === "read") return canRead(role);
    if (minimum === "edit") return canEdit(role);
    return canManageSharing(role);
  };

  if (!allowed(access.role)) {
    return {
      ok: false,
      response: jsonError(
        403,
        "FORBIDDEN",
        minimum === "share"
          ? "Only the owner can change sharing."
          : "You have view-only access to this document.",
      ),
    };
  }

  return { ok: true, access };
}
