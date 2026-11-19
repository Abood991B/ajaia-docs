import { notFound, redirect } from "next/navigation";
import { DocumentEditor } from "@/components/editor/DocumentEditor";
import { toDocumentDto } from "@/lib/dto";
import { getCurrentUser } from "@/lib/session";
import { getDocumentForUser, listShares } from "@/server/documents";

export const dynamic = "force-dynamic";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const access = await getDocumentForUser(id, user.id);
  if (!access) notFound();

  const shares = await listShares(id);

  return (
    <DocumentEditor
      document={toDocumentDto(access.document)}
      role={access.role}
      ownerName={access.ownerName}
      shares={shares}
      currentUser={user}
    />
  );
}
