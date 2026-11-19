"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { roleLabel } from "@/lib/access";

export type DocumentCard = {
  id: string;
  title: string;
  excerpt: string;
  updatedLabel: string;
  wordCount: number;
  role: "OWNER" | "EDITOR" | "VIEWER";
  ownerName: string;
  isOwned: boolean;
};

type Props = {
  owned: DocumentCard[];
  shared: DocumentCard[];
  userName: string;
};

function Card({ document }: { document: DocumentCard }) {
  return (
    <Link href={`/d/${document.id}`} className="card doc-card">
      <h3>{document.title}</h3>
      <p>{document.excerpt || "Empty document — open it and start writing."}</p>
      <div className="card-foot">
        <span className="mono">
          {document.wordCount} {document.wordCount === 1 ? "word" : "words"} ·{" "}
          {document.updatedLabel}
        </span>
        <span
          className={document.isOwned ? "badge badge-owner" : "badge badge-accent"}
        >
          {document.isOwned ? "Owned" : roleLabel(document.role)}
        </span>
      </div>
    </Link>
  );
}

export function DashboardClient({ owned, shared, userName }: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const match = (document: DocumentCard) =>
      !term ||
      document.title.toLowerCase().includes(term) ||
      document.excerpt.toLowerCase().includes(term);

    return {
      owned: owned.filter(match),
      shared: shared.filter(match),
    };
  }, [owned, shared, query]);

  async function createDocument() {
    setCreating(true);
    setError(null);

    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Untitled document" }),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error?.message ?? "Could not create a document.");
      setCreating(false);
      return;
    }

    router.push(`/d/${body.document.id}`);
  }

  async function onFileSelected(file: File | undefined) {
    if (!file) return;
    setImporting(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);

    const response = await fetch("/api/documents/import", {
      method: "POST",
      body: form,
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error?.message ?? "Could not import that file.");
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    router.push(`/d/${body.document.id}`);
  }

  const total = owned.length + shared.length;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>
            {total} {total === 1 ? "document" : "documents"} · signed in as{" "}
            {userName}
          </p>
          <h1 className="page-title">Documents</h1>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="file"
            ref={fileInput}
            className="sr-only"
            accept=".md,.markdown,.txt,.docx"
            onChange={(event) => void onFileSelected(event.target.files?.[0])}
          />
          <button
            type="button"
            className="btn"
            onClick={() => fileInput.current?.click()}
            disabled={importing}
            title="Import .md, .txt or .docx"
          >
            {importing ? "Importing…" : "Import file"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void createDocument()}
            disabled={creating}
          >
            {creating ? "Creating…" : "New document"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <input
          className="input"
          style={{ maxWidth: 300, height: 36 }}
          placeholder="Filter by title or text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Filter documents"
        />
        <span className="mono">.md · .txt · .docx up to 2 MB</span>
      </div>

      {error ? (
        <div className="alert alert-error" role="alert" style={{ marginTop: 16 }}>
          {error}
        </div>
      ) : null}

      <section>
        <div className="section-head">
          <h2>Your documents</h2>
          <span className="count-chip">{filtered.owned.length}</span>
        </div>

        {filtered.owned.length > 0 ? (
          <div className="doc-grid">
            {filtered.owned.map((document) => (
              <Card key={document.id} document={document} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <h3>{owned.length === 0 ? "Nothing here yet" : "No matches"}</h3>
            <p>
              {owned.length === 0
                ? "Create a document, or import a .md, .txt or .docx file to turn it into an editable document."
                : "No documents in this list match that filter."}
            </p>
          </div>
        )}
      </section>

      <section>
        <div className="section-head">
          <h2>Shared with you</h2>
          <span className="count-chip">{filtered.shared.length}</span>
        </div>

        {filtered.shared.length > 0 ? (
          <div className="doc-grid">
            {filtered.shared.map((document) => (
              <Card key={document.id} document={document} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <h3>{shared.length === 0 ? "No shared documents" : "No matches"}</h3>
            <p>
              {shared.length === 0
                ? "Open one of your documents as its owner and use Share to grant someone access."
                : "No shared documents match that filter."}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
