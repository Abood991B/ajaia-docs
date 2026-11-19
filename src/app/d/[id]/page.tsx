import { notFound, redirect } from "next/navigation";
import { DocumentEditor } from "@/components/editor/DocumentEditor";
import { toDocumentDto } from "@/lib/dto";
import { getCurrentUser } from "@/lib/session";
import { listComments } from "@/server/comments";
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

  const [shares, comments] = await Promise.all([
    access.role === "OWNER" ? listShares(id) : Promise.resolve([]),
    listComments(id),
  ]);

  return (
    <DocumentEditor
      document={toDocumentDto(access.document)}
      role={access.role}
      ownerName={access.ownerName}
      shares={shares}
      comments={comments}
      currentUser={user}
    />
  );
}
