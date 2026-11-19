import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardClient, type DocumentCard } from "@/components/DashboardClient";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { relativeTime } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { listDocumentsForUser } from "@/server/documents";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { owned, shared } = await listDocumentsForUser(user.id);

  const toCard = (document: (typeof owned)[number]): DocumentCard => ({
    id: document.id,
    title: document.title,
    excerpt: document.excerpt,
    updatedLabel: relativeTime(document.updatedAt),
    wordCount: document.wordCount,
    role: document.role,
    ownerName: document.ownerName,
    isOwned: document.isOwned,
  });

  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Logo />
          </span>
          Ajaia Docs
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="mono" style={{ textTransform: "none" }}>
            {user.name}
          </span>
          <SignOutButton />
        </div>
      </header>

      <DashboardClient
        owned={owned.map(toCard)}
        shared={shared.map(toCard)}
        userName={user.name}
      />
    </div>
  );
}
