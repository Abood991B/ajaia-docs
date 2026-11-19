import { randomUUID } from "node:crypto";
import { db, sqlite } from "./client";
import { documentShares, documents, users } from "./schema";
import { hashPassword } from "@/lib/password";

export const DEMO_PASSWORD = "Ajaia2026!";

const now = Date.now();

const seedUsers = [
  {
    id: "usr_abdulrahman",
    email: "abdulrahman16baidaq@gmail.com",
    name: "Abdulrahman Baidaq",
    passwordHash: hashPassword(DEMO_PASSWORD),
    createdAt: new Date(now - 1000 * 60 * 60 * 72),
  },
  {
    id: "usr_maya",
    email: "maya@ajaia.test",
    name: "Maya Chen",
    passwordHash: hashPassword(DEMO_PASSWORD),
    createdAt: new Date(now - 1000 * 60 * 60 * 48),
  },
  {
    id: "usr_sam",
    email: "sam@ajaia.test",
    name: "Sam Ortiz",
    passwordHash: hashPassword(DEMO_PASSWORD),
    createdAt: new Date(now - 1000 * 60 * 60 * 24),
  },
];

const seedDocuments = [
  {
    id: "doc_product_brief",
    ownerId: "usr_abdulrahman",
    title: "Product brief — Ajaia Docs",
    contentHtml: [
      "<h1>Product brief — Ajaia Docs</h1>",
      "<p><strong>Ajaia Docs</strong> is a focused collaborative editor: create a document, write it, share it with a teammate, and trust that it is still there tomorrow.</p>",
      "<h2>What ships in this slice</h2>",
      "<ul>",
      "<li>Rich text with headings, emphasis and lists</li>",
      "<li>Autosave with a visible save state</li>",
      "<li>Import from <code>.md</code>, <code>.txt</code> and <code>.docx</code></li>",
      "<li>Owner / editor / viewer access</li>",
      "</ul>",
      "<h2>What is deliberately out</h2>",
      "<p>Real-time co-editing, comments and version history. Each of those needs a data model that this timebox cannot do justice to.</p>",
      "<p>Open this document as <em>Maya</em> to edit, or as <em>Sam</em> to see the read-only view.</p>",
    ].join(""),
    contentText:
      "Product brief — Ajaia Docs Ajaia Docs is a focused collaborative editor: create a document, write it, share it with a teammate, and trust that it is still there tomorrow. What ships in this slice Rich text with headings, emphasis and lists Autosave with a visible save state Import from .md, .txt and .docx Owner / editor / viewer access What is deliberately out Real-time co-editing, comments and version history. Each of those needs a data model that this timebox cannot do justice to. Open this document as Maya to edit, or as Sam to see the read-only view.",
    createdAt: new Date(now - 1000 * 60 * 60 * 26),
    updatedAt: new Date(now - 1000 * 60 * 42),
  },
  {
    id: "doc_onboarding_notes",
    ownerId: "usr_maya",
    title: "Onboarding interview notes",
    contentHtml: [
      "<h1>Onboarding interview notes</h1>",
      "<p><strong>Participant:</strong> new hire, week one. <strong>Interviewer:</strong> Maya.</p>",
      "<h2>Where people get stuck</h2>",
      "<ol>",
      "<li>Nobody knows which document is the current one.</li>",
      "<li>Permissions are requested in chat, not in the product.</li>",
      "<li>Exported files immediately drift from the source.</li>",
      "</ol>",
      "<p>This document is shared with Abdulrahman as a <em>viewer</em> on purpose — it is the read-only case.</p>",
    ].join(""),
    contentText:
      "Onboarding interview notes Participant: new hire, week one. Interviewer: Maya. Where people get stuck Nobody knows which document is the current one. Permissions are requested in chat, not in the product. Exported files immediately drift from the source. This document is shared with Abdulrahman as a viewer on purpose — it is the read-only case.",
    createdAt: new Date(now - 1000 * 60 * 60 * 30),
    updatedAt: new Date(now - 1000 * 60 * 60 * 5),
  },
  {
    id: "doc_launch_checklist",
    ownerId: "usr_abdulrahman",
    title: "Launch checklist",
    contentHtml: [
      "<h1>Launch checklist</h1>",
      "<ul>",
      "<li>Import flow tested with a real <code>.docx</code></li>",
      "<li>Share dialog tested with a second account</li>",
      "<li>Refresh after editing — formatting must survive</li>",
      "<li>Read-only view confirmed</li>",
      "</ul>",
      "<p>Private document: no shares, so only the owner can see it.</p>",
    ].join(""),
    contentText:
      "Launch checklist Import flow tested with a real .docx Share dialog tested with a second account Refresh after editing — formatting must survive Read-only view confirmed Private document: no shares, so only the owner can see it.",
    createdAt: new Date(now - 1000 * 60 * 60 * 12),
    updatedAt: new Date(now - 1000 * 60 * 60 * 2),
  },
];

const seedShares = [
  {
    id: "shr_brief_maya",
    documentId: "doc_product_brief",
    userId: "usr_maya",
    role: "EDITOR" as const,
    createdAt: new Date(now - 1000 * 60 * 60 * 20),
  },
  {
    id: "shr_brief_sam",
    documentId: "doc_product_brief",
    userId: "usr_sam",
    role: "VIEWER" as const,
    createdAt: new Date(now - 1000 * 60 * 60 * 18),
  },
  {
    id: "shr_notes_abdulrahman",
    documentId: "doc_onboarding_notes",
    userId: "usr_abdulrahman",
    role: "VIEWER" as const,
    createdAt: new Date(now - 1000 * 60 * 60 * 10),
  },
];

export async function seed(): Promise<void> {
  await db.insert(users).values(seedUsers).onConflictDoNothing();
  await db.insert(documents).values(seedDocuments).onConflictDoNothing();
  await db.insert(documentShares).values(seedShares).onConflictDoNothing();
}

/** Used by tests and by `npm run db:reset`. */
export async function resetDatabase(): Promise<void> {
  await sqlite.execute("DELETE FROM document_shares");
  await sqlite.execute("DELETE FROM documents");
  await sqlite.execute("DELETE FROM users");
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}
